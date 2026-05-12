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
const PORTAL_OS_URL    = (assetId, srId) =>
  `https://www.gehealthcare.com.br/account/myequipment-360?assetId=${assetId}&srId=${srId}`;

const RATE_LIMIT_OS_MS     = 7_000;   // espera entre OSs no mesmo tenant
const RATE_LIMIT_TENANT_MS = 30_000;  // espera entre tenants
const DOWNLOAD_TIMEOUT_MS  = 60_000;  // tempo máx aguardando o `download` event
const POPUP_TIMEOUT_MS     = 30_000;  // tempo máx aguardando popup abrir (SPA pode demorar)
const TRIGGER_TIMEOUT_MS   = 30_000;  // tempo máx procurando botao 'Documentos disponiveis'

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

  await loginPage.close();
  return { browser, context };
}

// ─── Download de um documento específico ─────────────────────────────────────

// Selectors robustos: regex case-insensitive + alternativas separadas por virgula.
// O texto pode aparecer com diferentes capitalizacoes ou variantes de acento.
const RE_TRIGGER_POPUP = /documentos?\s+dispon[ií]ve(l|is)/i;
const RE_TITULO_POPUP  = /fazer\s+o\s+download\s+dos\s+documentos/i;
const RE_BOTAO_DOWNLOAD = /^(download|baixar)$/i;

async function abrirPopupDocumentos(page) {
  // Aguarda SPA terminar de carregar antes de procurar.
  await page.waitForLoadState('networkidle', { timeout: TRIGGER_TIMEOUT_MS }).catch(() => {});

  // Se popup ja esta aberto, nao precisa clicar.
  const popupJaAberto = await page.getByText(RE_TITULO_POPUP).count() > 0;
  if (popupJaAberto) return true;

  // Procura o trigger via regex case-insensitive (cobre 'Documentos disponiveis',
  // 'Documentos Disponíveis', etc.). Tambem tenta o role generico clicavel.
  const triggers = [
    page.getByText(RE_TRIGGER_POPUP).first(),
    page.locator('a, button').filter({ hasText: RE_TRIGGER_POPUP }).first(),
  ];

  let abriu = false;
  for (const trigger of triggers) {
    try {
      await trigger.waitFor({ state: 'visible', timeout: TRIGGER_TIMEOUT_MS });
      await trigger.click({ timeout: TRIGGER_TIMEOUT_MS });
      await page.getByText(RE_TITULO_POPUP).waitFor({ timeout: POPUP_TIMEOUT_MS });
      abriu = true;
      break;
    } catch { /* tenta proximo selector */ }
  }

  return abriu;
}

async function baixarUmDocumentoPorPopup({ page, indiceDocumento }) {
  const popupOk = await abrirPopupDocumentos(page);
  if (!popupOk) {
    // Provavelmente OS sem documentos publicados ainda no portal — caso
    // esperado, retorna null para o caller tratar como "nada a baixar"
    // sem persistir como erro.
    return null;
  }

  // Desmarca tudo, marca só o índice solicitado.
  const checkboxes = page.locator('input[type="checkbox"]');
  const total = await checkboxes.count();
  if (total === 0) {
    return null; // popup abriu mas nao tem documentos — sem PDFs
  }
  for (let i = 0; i < total; i++) {
    const cb = checkboxes.nth(i);
    if (await cb.isChecked()) await cb.uncheck();
  }
  if (indiceDocumento >= total) {
    throw new Error(`Indice ${indiceDocumento} fora do range (popup tem ${total} checkbox(es))`);
  }
  await checkboxes.nth(indiceDocumento).check();

  const botaoDownload = page.locator('button').filter({ hasText: RE_BOTAO_DOWNLOAD }).first();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT_MS }),
    botaoDownload.click(),
  ]);

  return download;
}

async function lerStreamComoBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ─── Captura de uma OS ───────────────────────────────────────────────────────

async function capturarPdfsDeOS({ context, tenantId, ordemServico, equipamento, tokens }) {
  const assetId        = equipamento.gehcAssetId;
  const srId           = ordemServico.gehcServiceId;            // UUID interno (500Ur...) — usado na URL do portal
  const trackingNumber = ordemServico.trackingNumber;           // numero amigavel (17159687) — exigido pelo documentSearch

  if (!assetId || !srId) {
    return { capturados: 0, erro: 'sem_asset_ou_sr_id' };
  }
  if (!trackingNumber) {
    return { capturados: 0, erro: 'sem_tracking_number (necessario para documentSearch)' };
  }

  // 1. Pergunta ao GraphQL quais documentos a OS tem (sem abrir browser).
  let docs = [];
  try {
    docs = await listarDocumentosDaOS({
      serviceRequestNumber: trackingNumber,
      accessToken:          tokens.accessToken,
      idToken:              tokens.idToken,
    });
  } catch (err) {
    return { capturados: 0, erro: `documentSearch_failed: ${err.message}` };
  }

  if (!docs.length) {
    return { capturados: 0, erro: null }; // OS sem documentos publicados
  }

  // 2. Filtra documentos que já estão baixados (idempotência via documentId).
  const ja = await prisma.gehcPdfDocumento.findMany({
    where: { documentId: { in: docs.map((d) => d.documentId) }, baixadoEm: { not: null } },
    select: { documentId: true },
  });
  const jaBaixados = new Set(ja.map((d) => d.documentId));
  const pendentes = docs.filter((d) => !jaBaixados.has(d.documentId));

  if (!pendentes.length) {
    return { capturados: 0, erro: null }; // tudo já baixado
  }

  // 3. Abre página da OS e baixa os pendentes, um por vez.
  const page = await context.newPage();
  let capturados = 0;
  const erros = [];

  try {
    await page.goto(PORTAL_OS_URL(assetId, srId), {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });

    for (let i = 0; i < pendentes.length; i++) {
      const doc = pendentes[i];
      // Reabrir popup pra cada download (fecha sozinho após cada DOWNLOAD).
      try {
        const download = await baixarUmDocumentoPorPopup({ page, indiceDocumento: i });
        if (!download) {
          // OS sem botao 'Documentos disponiveis' visivel no portal —
          // pode ser OS antiga, sem documentos publicados, ou mudanca de UI.
          // Nao persiste erro: na proxima rodada tenta de novo silenciosamente.
          erros.push(`${doc.documentId}: popup_indisponivel (sem documentos no portal)`);
          continue;
        }
        const buffer = await lerStreamComoBuffer(await download.createReadStream());

        const documentId = doc.documentId;
        const fileName   = doc.fileName || download.suggestedFilename();
        const fileHash   = crypto.createHash('sha256').update(buffer).digest('hex');
        const r2Key      = r2KeyParaPdf({ tenantId, gehcServiceId: srId, documentId });

        await uploadToR2(r2Key, buffer, 'application/pdf');

        await prisma.gehcPdfDocumento.upsert({
          where: { documentId },
          create: {
            tenantId,
            equipamentoId:  equipamento.id,
            ordemServicoId: ordemServico.id,
            documentId,
            fileName,
            fileHash,
            fileSizeBytes:  buffer.length,
            r2Key,
            baixadoEm:      new Date(),
            tentativas:     1,
            ultimaTentativaEm: new Date(),
            ultimoErro:     null,
          },
          update: {
            equipamentoId:  equipamento.id,
            ordemServicoId: ordemServico.id,
            fileName,
            fileHash,
            fileSizeBytes:  buffer.length,
            r2Key,
            baixadoEm:      new Date(),
            tentativas:     { increment: 1 },
            ultimaTentativaEm: new Date(),
            ultimoErro:     null,
          },
        });

        capturados++;
      } catch (err) {
        erros.push(`${doc.documentId}: ${err.message}`);

        // Persiste a falha para podermos ver na UI e retentar depois.
        await prisma.gehcPdfDocumento.upsert({
          where: { documentId: doc.documentId },
          create: {
            tenantId,
            equipamentoId:  equipamento.id,
            ordemServicoId: ordemServico.id,
            documentId:     doc.documentId,
            fileName:       doc.fileName,
            tentativas:     1,
            ultimaTentativaEm: new Date(),
            ultimoErro:     err.message?.slice(0, 1000),
          },
          update: {
            tentativas:     { increment: 1 },
            ultimaTentativaEm: new Date(),
            ultimoErro:     err.message?.slice(0, 1000),
          },
        });
      }
    }
  } finally {
    await page.close().catch(() => {});
  }

  return { capturados, erro: erros.length ? erros.join(' | ') : null };
}

// ─── Backfill orquestrado ────────────────────────────────────────────────────

/**
 * Roda backfill de PDFs para um tenant. RMs primeiro, depois resto.
 * Resumível: pula OSs cujo PDF já está baixado.
 *
 * @param {string} tenantId
 * @param {object} opts
 * @param {string[]} [opts.modalidades] - ex: ['MR'] (default: tudo, RM primeiro)
 * @param {number} [opts.diasAtras=180]
 * @param {number} [opts.limite=50] - número máximo de OSs por execução
 */
export async function executarBackfillPdfs({ tenantId, modalidades, diasAtras = 180, limite = 50 } = {}) {
  if (!tenantId) throw new Error('tenantId obrigatorio');

  const ativo = await estaAtivo(PIPELINE_NAMES.GEHC_CAPTURA_PDF, tenantId);
  if (!ativo) {
    console.log(`[GEHC_PDF] Pipeline pausado para tenant ${tenantId} — pulando backfill.`);
    return { processadas: 0, capturados: 0, motivo: 'pipeline_pausado' };
  }

  const dataCorte = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);

  const ordens = await prisma.gehcOrdemServico.findMany({
    where: {
      tenantId,
      requestedAt: { gte: dataCorte },
      // Só OSs cujo equipamento existe e tem assetId.
      equipamento: {
        gehcAssetId: { not: null },
        ...(modalidades?.length ? { tipo: { in: modalidades } } : {}),
      },
      // Só OSs que ainda não têm nenhum PDF baixado.
      pdfDocumentos: { none: { baixadoEm: { not: null } } },
    },
    include: { equipamento: true },
    orderBy: [
      // Prioridade: RMs primeiro (modality MR no GE), depois resto.
      { equipamento: { tipo: 'asc' } },
      { requestedAt: 'desc' },
    ],
    take: limite,
  });

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

  try {
    for (const ordem of ordens) {
      // Re-checa pausa a cada iteração — permite parada quente.
      if (!(await estaAtivo(PIPELINE_NAMES.GEHC_CAPTURA_PDF, tenantId))) {
        console.log(`[GEHC_PDF] Pipeline pausado durante execucao — interrompendo.`);
        break;
      }

      const resultado = await capturarPdfsDeOS({
        context: session.context,
        tenantId,
        ordemServico: ordem,
        equipamento:  ordem.equipamento,
        tokens,
      });

      processadas++;
      capturados += resultado.capturados;

      const tag = ordem.equipamento.tag || ordem.equipamento.id;
      console.log(
        `[GEHC_PDF] OS ${ordem.gehcServiceId} (${tag}): ` +
        `${resultado.capturados} PDF(s) capturados${resultado.erro ? ` · erro: ${resultado.erro}` : ''}`
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
