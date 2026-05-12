// Captura PDFs de OS GE via Playwright headless e armazena no Cloudflare R2.
//
// Por que Playwright e não fetch puro?
// O fluxo de download do portal GE é:
//   1. documentSearch (GraphQL) → lista PDFs disponíveis para a OS
//   2. downloadDocument (mutation) → retorna 202 (request aceito, async)
//   3. Popup com link para URL S3 pré-assinada (válida 7 dias) → download real
//
// Cada OS tem 1+ documentos. Marcar 2+ documentos no popup gera um ZIP no S3
// — para evitar lidar com unzip, marcamos APENAS UM por vez (o documento mais
// relevante: Service Report). Se a OS tem múltiplos, o popup é reaberto.
//
// O nome do arquivo segue o padrão MRR11625_CR_CSR_ServReq_17159687_20260325_069Ur00000YSvPeIAL.pdf,
// onde o ID do documento (069Ur...IAL) sempre fecha a string. Usamos isso para
// extrair o documentId canônico e garantir idempotência.

import { chromium } from 'playwright';
import crypto from 'crypto';
import prisma from '../prismaService.js';
import { lerCredenciais } from './gehcAuthService.js';
import { uploadToR2 } from '../uploads/fileStorageService.js';
import { listarDocumentosDaOS } from './gehcDocumentClient.js';
import { obterTokensGehc } from './gehcAuthService.js';
import { estaAtivo, PIPELINE_NAMES } from '../ai/aiPipelineState.js';

const PORTAL_LOGIN_URL = 'https://www.gehealthcare.com.br/account';
// Lista de OS do equipamento na aba 'Servico'. Mais eficiente que abrir 1
// pagina por OS — todas com 'Documentos disponiveis' aparecem juntas.
const PORTAL_LISTA_OS_URL = (assetId) =>
  `https://www.gehealthcare.com.br/account/myequipment-360?assetId=${assetId}#service-tab`;

const RATE_LIMIT_OS_MS     = 3_000;   // espera entre OSs no mesmo tenant
const RATE_LIMIT_TENANT_MS = 15_000;  // espera entre tenants
const DOWNLOAD_TIMEOUT_MS  = 60_000;  // tempo máx aguardando o `download` event
const POPUP_TIMEOUT_MS     = 30_000;  // tempo máx aguardando popup abrir (SPA pode demorar)
const TRIGGER_TIMEOUT_MS   = 20_000;  // tempo máx procurando botao Download

const R2_PREFIX = 'gehc-pdfs';

// ─── Helpers de identidade ───────────────────────────────────────────────────

function extrairDocumentIdDoNome(fileName) {
  // Padrão observado: PREFIXO..._<documentId>.pdf
  // Ex: MRR11625_CR_CSR_ServReq_17159687_20260325_069Ur00000YSvPeIAL.pdf
  const sem = fileName.replace(/\.pdf$/i, '');
  const parts = sem.split('_');
  return parts[parts.length - 1] || null;
}

function r2KeyParaPdf({ tenantId, gehcServiceId, documentId }) {
  return `${R2_PREFIX}/${tenantId}/${gehcServiceId}/${documentId}.pdf`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Sessão Playwright autenticada ───────────────────────────────────────────

async function realizarLoginNaPagina(page, login, password) {
  await page.goto(PORTAL_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const emailInput = page.locator([
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    'input[type="text"]',
    'input[id="username"]',
  ].join(', ')).first();
  await emailInput.waitFor({ timeout: 20_000 });
  await emailInput.fill(login);

  const passInput = page.locator(
    'input[name="password"], input[type="password"], input[id="password"]'
  ).first();
  await passInput.waitFor({ timeout: 10_000 });
  await passInput.fill(password);

  const submitBtn = page.locator(
    'button[type="submit"], input[type="submit"], button:has-text("Sign"), button:has-text("Entrar"), button:has-text("Login")'
  ).first();
  if ((await submitBtn.count()) > 0) {
    await submitBtn.click();
  } else {
    await passInput.press('Enter');
  }

  // Confirma autenticação esperando o input de senha sumir.
  await page.waitForFunction(
    () => !document.querySelector('input[type="password"]'),
    { timeout: 30_000 }
  ).catch(() => {});

  // CRITICO: navegar para /myequipment e aguardar networkidle ESTABELECE a
  // sessao Salesforce/SFM. Sem este passo, navegar para
  // myequipment-360?assetId=...&srId=... cai na tela de login (URL
  // logon.gehealthcare.com/loginflow/...). Mesma estrategia usada por
  // gehcAuthService.capturarTokensViaPlaywright que ja funciona em prod.
  await page.goto('https://www.gehealthcare.com.br/myequipment', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
}

/**
 * Abre browser, faz login no portal GE e retorna { browser, context }.
 * O chamador é responsável por fechar o browser quando terminar.
 */
export async function abrirSessaoAutenticada(tenantId) {
  const creds = await lerCredenciais(tenantId);
  const login    = creds?.login    ?? process.env.GEHC_LOGIN;
  const password = creds?.password ?? process.env.GEHC_PASSWORD;

  if (!login || !password) {
    throw new Error('Credenciais GE nao configuradas para o tenant.');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const loginPage = await context.newPage();

  try {
    await realizarLoginNaPagina(loginPage, login, password);
  } catch (err) {
    await browser.close();
    throw err;
  }

  // NAO fechar a loginPage — ela mantem viva a sessao SFM no contexto.
  // Algumas implementacoes do Salesforce requerem ao menos uma aba ativa
  // para renovar tokens silenciosamente. Reusamos no callsite quando
  // possivel, e fechamos so apos terminar tudo.
  return { browser, context, loginPage };
}

// ─── Download de um documento específico ─────────────────────────────────────

// Selectors do portal MyEquipment 360.
// ATENCAO: o texto "Documentos disponíveis" na lista de OSs e apenas LABEL
// informativa (em verde), NAO um botao clicavel. O elemento clicavel real
// e o botao "Download" ao lado direito da linha. Ao clicar nele, abre o
// popup "Fazer o download dos documentos" com checkboxes.
const RE_TITULO_POPUP   = /fazer\s+o\s+download\s+dos\s+documentos/i;
const RE_BOTAO_DOWNLOAD = /^(download|baixar)$/i;

async function clicarBotaoDownloadDaOs({ page }) {
  // Pequena pausa para o framework SPA terminar de hidratar a tela depois
  // do navigate. NAO usar 'networkidle' — em SPAs com analytics/websockets
  // o estado idle nunca chega e o timeout estoura.
  await page.waitForTimeout(2_000);

  // Detecta redirect para tela de login — sessao Salesforce nao foi
  // estabelecida ou expirou. Curto-circuita com erro claro em vez de
  // ficar buscando seletores num formulario de login.
  const urlAtual = page.url();
  if (urlAtual.includes('logon.gehealthcare.com') || urlAtual.includes('loginflow')) {
    throw new Error(`sessao_perdida: navegacao caiu em ${urlAtual.slice(0, 80)}...`);
  }

  // Se o popup ja esta aberto (caso raro), nao precisa clicar.
  const popupJaAberto = await page.getByText(RE_TITULO_POPUP).count() > 0;
  if (popupJaAberto) return true;

  // Procura o botao "Download" da OS (clicavel, em a/button) — varias
  // estrategias de selector em ordem de preferencia. O texto "Documentos
  // disponíveis" e ignorado intencionalmente (e label, nao botao).
  const tentativas = [
    page.getByRole('button', { name: RE_BOTAO_DOWNLOAD }).first(),
    page.getByRole('link',   { name: RE_BOTAO_DOWNLOAD }).first(),
    page.locator('button').filter({ hasText: RE_BOTAO_DOWNLOAD }).first(),
    page.locator('a').filter({ hasText: RE_BOTAO_DOWNLOAD }).first(),
  ];

  for (const trigger of tentativas) {
    try {
      await trigger.waitFor({ state: 'visible', timeout: TRIGGER_TIMEOUT_MS });
      await trigger.click({ timeout: TRIGGER_TIMEOUT_MS });
      // Aguarda popup abrir; se nao abrir em 5s, talvez tenha baixado direto
      await page.getByText(RE_TITULO_POPUP).waitFor({ timeout: 5_000 }).catch(() => {});
      return true;
    } catch { /* tenta proximo selector */ }
  }

  // Ultimo recurso: dump de debug para diagnostico (so URL e contagem de
  // botoes, nao o HTML completo para nao explodir log).
  try {
    const url = page.url();
    const totalBotoes = await page.locator('button, a').count();
    const textosVisiveis = await page.locator('button, a').allInnerTexts();
    const previewTextos = textosVisiveis.slice(0, 20).filter(Boolean).map((t) => t.trim()).join(' | ');
    console.warn(`[GEHC_PDF_DEBUG] popup_indisponivel em ${url} — ${totalBotoes} botoes/links visiveis. Preview: ${previewTextos}`);
  } catch { /* ignora erros do debug */ }

  return false;
}

async function baixarUmDocumentoPorPopup({ page, indiceDocumento }) {
  const ok = await clicarBotaoDownloadDaOs({ page });
  if (!ok) {
    // Provavelmente OS sem documentos publicados ainda no portal, ou layout
    // diferente do esperado — caso nao-bloqueante, retorna null.
    return null;
  }

  // Caso especial: clicar no Download da lista pode baixar 1 arquivo direto
  // (sem popup) quando a OS tem apenas 1 documento. Detectamos via timeout
  // curto antes de tentar interagir com checkboxes.
  const popupVisivel = (await page.getByText(RE_TITULO_POPUP).count()) > 0;
  if (!popupVisivel) {
    // Nao apareceu popup — espera download direto disparado pelo botao.
    try {
      const download = await page.waitForEvent('download', { timeout: 8_000 });
      return download;
    } catch {
      // Nao baixou nem abriu popup — falha real.
      return null;
    }
  }

  // Caso comum: popup aberto, marcar 1 checkbox e clicar DOWNLOAD do popup.
  const checkboxes = page.locator('input[type="checkbox"]');
  const total = await checkboxes.count();
  if (total === 0) {
    return null;
  }
  for (let i = 0; i < total; i++) {
    const cb = checkboxes.nth(i);
    if (await cb.isChecked()) await cb.uncheck();
  }
  if (indiceDocumento >= total) {
    throw new Error(`Indice ${indiceDocumento} fora do range (popup tem ${total} checkbox(es))`);
  }
  await checkboxes.nth(indiceDocumento).check();

  const botaoDownloadPopup = page.locator('button').filter({ hasText: RE_BOTAO_DOWNLOAD }).last();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT_MS }),
    botaoDownloadPopup.click(),
  ]);

  return download;
}

async function lerStreamComoBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ─── Captura de TODAS as OSs de um equipamento (1 navegacao) ────────────────
//
// Estrategia objetiva: navegar UMA vez para a lista de OSs do equipamento
// e baixar todos os PDFs visiveis com 'Documentos disponiveis'. Em vez de
// abrir 1 pagina por OS (Playwright + SPA + analytics = ~30s cada), aqui
// e 1 pagina por equipamento + N cliques rapidos no mesmo DOM.
//
// Como 'Documentos disponiveis' so aparece para OS com PDFs ja publicados
// pelo GE, o filtro fica natural — nao gastamos tempo com OSs vazias.

async function capturarPdfsDeEquipamento({ context, tenantId, equipamento, ordens, tokens }) {
  const assetId = equipamento.gehcAssetId;
  if (!assetId) return { capturados: 0, processadas: 0, erro: 'sem_asset_id' };
  if (!ordens.length) return { capturados: 0, processadas: 0, erro: null };

  // Mapa trackingNumber -> ordem (para encontrar a ordem ao processar a row)
  const ordensPorTracking = new Map();
  for (const o of ordens) {
    if (o.trackingNumber) ordensPorTracking.set(String(o.trackingNumber), o);
  }
  if (ordensPorTracking.size === 0) {
    return { capturados: 0, processadas: 0, erro: 'nenhuma_os_com_tracking_number' };
  }

  const page = await context.newPage();
  let capturados = 0;
  let processadas = 0;
  const erros = [];

  try {
    await page.goto(PORTAL_LISTA_OS_URL(assetId), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // SPA do Salesforce hidratar — pequena pausa fixa em vez de networkidle
    // (que nunca chega em SPAs com analytics/websockets).
    await page.waitForTimeout(3_000);

    // Detecta redirect para tela de login
    const urlAtual = page.url();
    if (urlAtual.includes('logon.gehealthcare.com') || urlAtual.includes('loginflow')) {
      return { capturados: 0, processadas: 0, erro: `sessao_perdida: ${urlAtual.slice(0, 80)}` };
    }

    // Selector ESTAVEL descoberto via inspecao do DOM real do portal:
    //   <div class="ge-equipment-service-history__item">       <- card completo
    //     <div class="...__wrapper">  numero SR + 'Documentos disponiveis'
    //     <div class="...__holder">   <button>Detalhes</button> <button>Download</button>
    //   </div>
    // Aguarda pelo menos 1 card aparecer COM CONTEUDO HIDRATADO (numero SR
    // visivel) — sem isso, snapshotar items pode pegar skeletons placeholders
    // de SPA ainda em hidratacao.
    const itemSelector = '.ge-equipment-service-history__item';
    const numeroSelector = '.ge-equipment-service-history__number';
    const temItem = await page.locator(itemSelector).first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true).catch(() => false);

    if (!temItem) {
      return { capturados: 0, processadas: 0, erro: 'lista_sem_items_de_servico' };
    }

    // Aguarda hidratacao real: pelo menos 1 numero SR com texto nao-vazio
    // dentro de algum card. Fallback de 5s — se nao hidratar, ja era.
    await page.waitForFunction(
      (sel) => {
        const els = document.querySelectorAll(sel);
        return [...els].some(el => /\d{5,}/.test(el.textContent || ''));
      },
      numeroSelector,
      { timeout: 5_000 },
    ).catch(() => {});

    // Pega TODOS os cards de OS visiveis e processa um a um.
    const items = await page.locator(itemSelector).all();
    console.log(`[GEHC_PDF] ${equipamento.tag || equipamento.id}: ${items.length} card(s) de OS visiveis na lista.`);

    for (const item of items) {
      try {
        // Numero da OS sai do .ge-equipment-service-history__number — formato:
        // <div><span>Nº SR</span>17386673</div>
        const textoNumero = await item.locator('.ge-equipment-service-history__number')
          .textContent({ timeout: 3_000 }).catch(() => '');
        const matchSR = textoNumero?.match(/(\d{5,})/);
        if (!matchSR) {
          // Card sem numero visivel — pula (provavelmente loading skeleton)
          continue;
        }
        const trackingNumber = matchSR[1];
        const ordem = ordensPorTracking.get(trackingNumber);
        if (!ordem) {
          // OS na lista mas nao no nosso conjunto (ja baixada ou fora da janela)
          continue;
        }

        // So tem botao Download se 'Documentos disponiveis' estiver presente
        // no card (filtro natural — OS sem PDF nem chega aqui).
        const temDocsDisponiveis = await item
          .locator('.ge-equipment-service-history-activity-info__title')
          .filter({ hasText: /documentos?\s+dispon[ií]ve/i })
          .count() > 0;
        if (!temDocsDisponiveis) continue;

        // Resolve documentos do GraphQL (idempotencia + filename real).
        let docsPendentes = [];
        try {
          const docs = await listarDocumentosDaOS({
            serviceRequestNumber: trackingNumber,
            accessToken: tokens?.accessToken,
            idToken: tokens?.idToken,
          });
          if (docs.length) {
            const ja = await prisma.gehcPdfDocumento.findMany({
              where: { documentId: { in: docs.map((d) => d.documentId) }, baixadoEm: { not: null } },
              select: { documentId: true },
            });
            const jaSet = new Set(ja.map((d) => d.documentId));
            docsPendentes = docs.filter((d) => !jaSet.has(d.documentId));
          }
        } catch (err) {
          erros.push(`SR${trackingNumber}: documentSearch ${err.message}`);
          continue;
        }

        if (!docsPendentes.length) continue; // nada a fazer

        // Botao Download esta no .ge-equipment-service-history__holder do card.
        const downloadBtn = item.locator('.ge-equipment-service-history__holder button')
          .filter({ hasText: /^(download|baixar)$/i }).first();
        const visivel = await downloadBtn.isVisible({ timeout: 3_000 }).catch(() => false);
        if (!visivel) {
          erros.push(`SR${trackingNumber}: botao_download_nao_visivel`);
          continue;
        }

        // Para cada documento pendente da OS, faz 1 ciclo de clique+download
        for (let i = 0; i < docsPendentes.length; i++) {
          const doc = docsPendentes[i];
          processadas++;
          try {
            const download = await disparaDownloadDoBotao({ page, downloadBtn, indiceDocumento: i });
            if (!download) {
              erros.push(`${doc.documentId}: nada_baixado`);
              continue;
            }
            const buffer = await lerStreamComoBuffer(await download.createReadStream());
            const fileName = doc.fileName || download.suggestedFilename();
            const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
            const r2Key = r2KeyParaPdf({ tenantId, gehcServiceId: ordem.gehcServiceId, documentId: doc.documentId });

            await uploadToR2(r2Key, buffer, 'application/pdf');

            await prisma.gehcPdfDocumento.upsert({
              where: { documentId: doc.documentId },
              create: {
                tenantId,
                equipamentoId: equipamento.id,
                ordemServicoId: ordem.id,
                documentId: doc.documentId,
                fileName, fileHash, fileSizeBytes: buffer.length, r2Key,
                baixadoEm: new Date(),
                tentativas: 1,
                ultimaTentativaEm: new Date(),
                ultimoErro: null,
              },
              update: {
                fileName, fileHash, fileSizeBytes: buffer.length, r2Key,
                baixadoEm: new Date(),
                tentativas: { increment: 1 },
                ultimaTentativaEm: new Date(),
                ultimoErro: null,
              },
            });
            capturados++;
          } catch (err) {
            erros.push(`${doc.documentId}: ${err.message?.slice(0, 100)}`);
            await prisma.gehcPdfDocumento.upsert({
              where: { documentId: doc.documentId },
              create: {
                tenantId,
                equipamentoId: equipamento.id,
                ordemServicoId: ordem.id,
                documentId: doc.documentId,
                fileName: doc.fileName,
                tentativas: 1,
                ultimaTentativaEm: new Date(),
                ultimoErro: err.message?.slice(0, 1000),
              },
              update: {
                tentativas: { increment: 1 },
                ultimaTentativaEm: new Date(),
                ultimoErro: err.message?.slice(0, 1000),
              },
            }).catch(() => {});
          }
        }
      } catch (err) {
        erros.push(`row: ${err.message?.slice(0, 100)}`);
      }
    }
  } finally {
    await page.close().catch(() => {});
  }

  return { capturados, processadas, erro: erros.length ? erros.join(' | ').slice(0, 500) : null };
}

// Helper que aciona o botao Download e captura o download — cobre 2 cenarios:
// (a) baixa direto (1 PDF), (b) abre popup com checkboxes (multiplos PDFs).
async function disparaDownloadDoBotao({ page, downloadBtn, indiceDocumento }) {
  // Tenta capturar download imediato OU detectar popup
  const popupAntes = await page.getByText(/fazer\s+o\s+download\s+dos\s+documentos/i).count();

  // Clica e espera ate 5s pelo download direto
  const promiseDownload = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
  await downloadBtn.click().catch(() => {});

  const downloadDireto = await promiseDownload;
  if (downloadDireto) return downloadDireto;

  // Nao baixou direto — verificar se popup abriu
  await page.waitForTimeout(1_500);
  const popupDepois = await page.getByText(/fazer\s+o\s+download\s+dos\s+documentos/i).count();

  if (popupDepois > popupAntes) {
    // Popup aberto — marcar checkbox correto e clicar DOWNLOAD do popup
    const checkboxes = page.locator('input[type="checkbox"]');
    const total = await checkboxes.count();
    if (total === 0 || indiceDocumento >= total) return null;

    for (let i = 0; i < total; i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isChecked()) await cb.uncheck().catch(() => {});
    }
    await checkboxes.nth(indiceDocumento).check().catch(() => {});

    const botaoPopup = page.locator('button').filter({ hasText: /^(download|baixar)$/i }).last();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT_MS }),
      botaoPopup.click(),
    ]);
    return download;
  }

  return null;
}

// ─── Backfill orquestrado ────────────────────────────────────────────────────

/**
 * Roda backfill de PDFs para um tenant.
 * Distribui as OSs ENTRE equipamentos (top N por equipamento) em vez de
 * concentrar tudo em poucos — assim a IA ganha contexto horizontal mais
 * rapidamente. Resumível: pula OSs cujo PDF já está baixado.
 *
 * @param {string} tenantId
 * @param {object} opts
 * @param {string[]} [opts.modalidades] - ex: ['MR'] (default: tudo)
 * @param {number} [opts.diasAtras=180]
 * @param {number} [opts.limite=50] - número máximo TOTAL de OSs por execução
 * @param {number} [opts.maxPorEquipamento=5] - cap de OSs por equipamento por execução
 */
export async function executarBackfillPdfs({
  tenantId,
  modalidades,
  diasAtras = 180,
  limite = 50,
  maxPorEquipamento = 5,
} = {}) {
  if (!tenantId) throw new Error('tenantId obrigatorio');

  const ativo = await estaAtivo(PIPELINE_NAMES.GEHC_CAPTURA_PDF, tenantId);
  if (!ativo) {
    console.log(`[GEHC_PDF] Pipeline pausado para tenant ${tenantId} — pulando backfill.`);
    return { processadas: 0, capturados: 0, motivo: 'pipeline_pausado' };
  }

  const dataCorte = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);

  // Algoritmo (atende reviews Codex PRs #42, #46):
  //   1. Lista equipamentos com pelo menos 1 OS pendente
  //   2. Ordena por 'menos recentemente capturado primeiro' (eqs nunca
  //      capturados vem antes; depois os com PDF mais antigo) — garante
  //      rotacao justa entre execucoes, sem starvation
  //   3. CAP de fan-out: pega so os primeiros N (= limite/maxPorEquipamento
  //      + folga). Evita 200 queries simultaneas saturando connection pool
  //   4. Para cada eq selecionado, busca top maxPorEquipamento OSs em paralelo
  //   5. Round-robin para preencher o limite global
  const eqsCandidatos = await prisma.equipamento.findMany({
    where: {
      tenantId,
      gehcAssetId: { not: null },
      ...(modalidades?.length ? { tipo: { in: modalidades } } : {}),
      gehcOrdensServico: {
        some: {
          requestedAt: { gte: dataCorte },
          pdfDocumentos: { none: { baixadoEm: { not: null } } },
        },
      },
    },
    select: {
      id: true, tag: true, tipo: true,
      gehcPdfDocumentos: {
        where: { baixadoEm: { not: null } },
        orderBy: { baixadoEm: 'desc' },
        take: 1,
        select: { baixadoEm: true },
      },
    },
  });

  if (!eqsCandidatos.length) {
    console.log(`[GEHC_PDF] Nada a fazer para tenant ${tenantId} (todas as OSs já têm PDF).`);
    return { processadas: 0, capturados: 0 };
  }

  // Ordenacao justa: nulls first (nunca capturados), depois asc (mais antigo
  // primeiro). Garante que eqs ignorados em execucoes anteriores avancam.
  eqsCandidatos.sort((a, b) => {
    const ua = a.gehcPdfDocumentos[0]?.baixadoEm;
    const ub = b.gehcPdfDocumentos[0]?.baixadoEm;
    if (!ua && !ub) return 0;
    if (!ua) return -1;
    if (!ub) return 1;
    return ua.getTime() - ub.getTime();
  });

  // Cap fan-out: nunca dispara mais queries que o necessario para o limite.
  // Folga de 2 eqs cobre casos onde algum eq tem menos de maxPorEquipamento OSs.
  const maxEqs = Math.ceil(limite / maxPorEquipamento) + 2;
  const eqsComPendentes = eqsCandidatos.slice(0, maxEqs);

  console.log(
    `[GEHC_PDF] Tenant ${tenantId}: ${eqsCandidatos.length} eq(s) com pendentes; ` +
    `processando ${eqsComPendentes.length} nesta execucao (rotacao por ultima captura).`
  );

  // Pool por equipamento (em paralelo, fan-out limitado)
  const poolPorEq = await Promise.all(eqsComPendentes.map(async (eq) => {
    const ordens = await prisma.gehcOrdemServico.findMany({
      where: {
        tenantId,
        equipamentoId: eq.id,
        requestedAt: { gte: dataCorte },
        pdfDocumentos: { none: { baixadoEm: { not: null } } },
      },
      include: { equipamento: true },
      orderBy: { requestedAt: 'desc' },
      take: maxPorEquipamento,
    });
    return ordens;
  }));

  // Round-robin: pega ordem[i] de cada eq, depois ordem[i+1], ate atingir limite
  const distribuidas = [];
  let temMaisOSs = true;
  let i = 0;
  while (temMaisOSs && distribuidas.length < limite) {
    temMaisOSs = false;
    for (const ordensDoEq of poolPorEq) {
      if (i < ordensDoEq.length) {
        distribuidas.push(ordensDoEq[i]);
        temMaisOSs = true;
        if (distribuidas.length >= limite) break;
      }
    }
    i++;
  }

  const ordens = distribuidas;

  if (!ordens.length) {
    console.log(`[GEHC_PDF] Nada a fazer para tenant ${tenantId} (todas as OSs já têm PDF).`);
    return { processadas: 0, capturados: 0 };
  }

  console.log(`[GEHC_PDF] Backfill tenant=${tenantId} — ${ordens.length} OS(s) pendente(s).`);

  let tokens;
  try {
    tokens = await obterTokensGehc(tenantId);
  } catch (err) {
    console.error(`[GEHC_PDF] Falha autenticando tenant ${tenantId}: ${err.message}`);
    return { processadas: 0, capturados: 0, motivo: 'auth_failed' };
  }

  let session;
  try {
    session = await abrirSessaoAutenticada(tenantId);
  } catch (err) {
    console.error(`[GEHC_PDF] Falha abrindo sessao Playwright tenant ${tenantId}: ${err.message}`);
    return { processadas: 0, capturados: 0, motivo: 'browser_failed' };
  }

  let processadas = 0;
  let capturados  = 0;

  // Agrupa OSs pendentes por equipamento — assim abrimos UMA pagina por
  // equipamento em vez de uma por OS.
  const porEquipamento = new Map();
  for (const o of ordens) {
    const eqId = o.equipamento.id;
    if (!porEquipamento.has(eqId)) porEquipamento.set(eqId, { equipamento: o.equipamento, ordens: [] });
    porEquipamento.get(eqId).ordens.push(o);
  }

  try {
    for (const { equipamento, ordens: ordensDoEquipamento } of porEquipamento.values()) {
      // Re-checa pausa a cada equipamento — permite parada quente.
      if (!(await estaAtivo(PIPELINE_NAMES.GEHC_CAPTURA_PDF, tenantId))) {
        console.log(`[GEHC_PDF] Pipeline pausado durante execucao — interrompendo.`);
        break;
      }

      // Tokens passados explicitamente (NAO via variavel global) — evita
      // race condition entre backfills concorrentes (worker tem
      // concurrency: 5) e cross-tenant credential leak.
      const resultado = await capturarPdfsDeEquipamento({
        context: session.context,
        tenantId,
        equipamento,
        ordens: ordensDoEquipamento,
        tokens,
      });

      processadas += resultado.processadas || 0;
      capturados  += resultado.capturados  || 0;

      const tag = equipamento.tag || equipamento.id;
      console.log(
        `[GEHC_PDF] Equipamento ${tag}: ${resultado.capturados} PDF(s) capturados ` +
        `(${resultado.processadas} processadas de ${ordensDoEquipamento.length} OSs pendentes)` +
        `${resultado.erro ? ` · erro: ${resultado.erro}` : ''}`
      );

      await sleep(RATE_LIMIT_OS_MS);
    }
  } finally {
    await session.browser.close().catch(() => {});
  }

  console.log(
    `[GEHC_PDF] Backfill concluido tenant=${tenantId}: ${processadas} OS(s) processadas, ${capturados} PDF(s) capturados.`
  );

  return { processadas, capturados };
}

/**
 * Roda backfill em todos os tenants ativos, em série (rate limit cordial).
 */
export async function executarBackfillTodosTenants(opts = {}) {
  const ativoGlobal = await estaAtivo(PIPELINE_NAMES.GEHC_CAPTURA_PDF);
  if (!ativoGlobal) {
    console.log('[GEHC_PDF] Pipeline globalmente pausado — pulando.');
    return { tenants: 0, processadas: 0, capturados: 0 };
  }

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
  });

  let totalProcessadas = 0;
  let totalCapturados  = 0;

  for (const t of tenants) {
    try {
      const r = await executarBackfillPdfs({ tenantId: t.id, ...opts });
      totalProcessadas += r.processadas || 0;
      totalCapturados  += r.capturados  || 0;
    } catch (err) {
      console.error(`[GEHC_PDF] Tenant ${t.nome} (${t.id}) falhou: ${err.message}`);
    }
    await sleep(RATE_LIMIT_TENANT_MS);
  }

  return { tenants: tenants.length, processadas: totalProcessadas, capturados: totalCapturados };
}
