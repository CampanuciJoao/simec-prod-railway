// Captura PDFs de OS GE via Playwright headless e extrai conteudo na hora.
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
//
// Armazenamento: o PDF NAO eh persistido (R2 ficou para tras). Logo apos o
// download em memoria chamamos extrairUmPdf() com o buffer; o conteudo
// extraido vai para gehcPdfExtraido e o buffer eh descartado. gehcPdfDocumento
// continua sendo gravado para dedup e auditoria, mas com r2Key=null.

import { chromium } from 'playwright';
import crypto from 'crypto';
import prisma from '../prismaService.js';
import { lerCredenciais } from './gehcAuthService.js';
import { listarDocumentosDaOS } from './gehcDocumentClient.js';
import { obterTokensGehc } from './gehcAuthService.js';
import { estaAtivo, PIPELINE_NAMES } from '../ai/aiPipelineState.js';
import { extrairUmPdf } from './gehcPdfExtractionOrchestrator.js';
import {
  CATEGORIAS_LOG,
  novaTimeline,
  registrarLog,
  marcarComoResolvido,
  categorizarErro,
} from './gehcDownloadLogger.js';
import {
  dispararAlertaFalhaSistemica,
  resolverAlertaFalhaSistemica,
} from './gehcDownloaderAlerter.js';

const PORTAL_LOGIN_URL = 'https://www.gehealthcare.com.br/account';
// Lista de OS do equipamento na aba 'Servico'. Mais eficiente que abrir 1
// pagina por OS — todas com 'Documentos disponiveis' aparecem juntas.
const PORTAL_LISTA_OS_URL = (assetId) =>
  `https://www.gehealthcare.com.br/account/myequipment-360?assetId=${assetId}#service-tab`;

const RATE_LIMIT_OS_MS     = 3_000;   // espera entre OSs no mesmo tenant
const RATE_LIMIT_TENANT_MS = 15_000;  // espera entre tenants
const DOWNLOAD_TIMEOUT_MS  = 120_000; // tempo máx aguardando o `download` event
                                      // (portal GE intermitente; 60s era curto)
const POPUP_TIMEOUT_MS     = 30_000;  // tempo máx aguardando popup abrir (SPA pode demorar)
const TRIGGER_TIMEOUT_MS   = 20_000;  // tempo máx procurando botao Download

// Circuit breaker — apos N tentativas consecutivas falhando, "quarentena"
// o documento por X dias. Evita gastar Playwright todo ciclo tentando
// docs que provavelmente estao com problema permanente no portal GE
// (S3 expirado, OS marcada como restrita, PDF corrompido, etc).
const CIRCUIT_BREAKER_TENTATIVAS = 10;       // mais permissivo (3 inline x ~3 ciclos)
const CIRCUIT_BREAKER_DIAS_QUARENTENA = 7;

// Retry inline por documento dentro de uma execucao. Escalonado: a 1a
// tentativa eh imediata, depois espera RETRY_BACKOFF_MS[i] entre tentativas.
const RETRY_INLINE_MAX = 3;
const RETRY_BACKOFF_MS = [0, 30_000, 60_000]; // antes da 1a, 2a, 3a tentativa

// Detector inline de falha sistemica: se N docs CONSECUTIVOS esgotam
// suas 3 tentativas, eh provavel problema maior (sessao, layout, portal
// fora). Quebra a execucao e gera alerta interno (sem Telegram).
const FALHAS_CONSECUTIVAS_PARA_SISTEMICO = 3;

// Categorias de erro PERMANENTE — nao adianta fazer retry inline.
// SESSAO_PERDIDA tenta re-login no proximo ciclo; layout exige fix.
const CATEGORIAS_PERMANENTES = new Set([
  'BOTAO_NAO_ENCONTRADO',
]);

// Categorias que se beneficiam de re-login inline (nao adianta retry sem auth).
const CATEGORIAS_REAUTH = new Set([
  'SESSAO_PERDIDA',
]);

// R2_PREFIX e r2KeyParaPdf permanecem para compatibilidade com PDFs legados
// que ainda existirem no bucket (limpeza explicita via endpoint dedicado).
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

  // VERIFICACAO POS-LOGIN: se networkidle deu timeout silencioso, a sessao
  // Salesforce pode nao ter sido estabelecida. Quando isso acontece, qualquer
  // navegacao seguinte redireciona pra logon.gehealthcare.com/loginflow/...
  // Detectamos aqui ANTES de retornar pra que o chamador possa fazer retry.
  const urlPosLogin = page.url();
  if (urlPosLogin.includes('logon.gehealthcare.com') || urlPosLogin.includes('loginflow')) {
    throw new Error(
      `login_redirect_loop: sessao Salesforce nao estabelecida apos login ` +
      `(URL final: ${urlPosLogin.slice(0, 100)})`
    );
  }
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

  // Retry curto: networkidle do Salesforce ocasionalmente nao estabelece a
  // sessao no 1o login (concorrencia, latencia, SPA hidratando devagar). Um
  // 2o tentativa com browser limpo costuma resolver. Mais que 2 nao adianta
  // (problema seria de credencial/portal, nao transitorio).
  const MAX_TENTATIVAS = 2;
  let ultimaErro;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const loginPage = await context.newPage();

    try {
      await realizarLoginNaPagina(loginPage, login, password);
      // NAO fechar a loginPage — ela mantem viva a sessao SFM no contexto.
      // Algumas implementacoes do Salesforce requerem ao menos uma aba ativa
      // para renovar tokens silenciosamente. Reusamos no callsite quando
      // possivel, e fechamos so apos terminar tudo.
      if (tentativa > 1) {
        console.log(`[GEHC_AUTH] Sessao estabelecida na ${tentativa}a tentativa.`);
      }
      return { browser, context, loginPage };
    } catch (err) {
      ultimaErro = err;
      await browser.close().catch(() => {});
      console.log(
        `[GEHC_AUTH] Tentativa ${tentativa}/${MAX_TENTATIVAS} falhou: ${err.message}`
      );
      // Backoff curto antes da proxima tentativa
      if (tentativa < MAX_TENTATIVAS) {
        await sleep(5_000);
      }
    }
  }
  throw ultimaErro;
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

// O portal GE Healthcare nao serve PDF via download event — ele chama o
// gateway GraphQL (la-prd-shared-services-cdx-api-gateway), recebe uma URL
// S3 pre-assinada (X-Amz-Expires=604800), e abre via <a> que o Chrome
// renderiza inline. Por isso `page.waitForEvent('download')` nunca dispara
// no Playwright. Diagnostico completo: captura ao vivo de fetch/XHR
// confirmou padrao em 2026-05-16 (OSs MRR9826A e MRR11625).
//
// Estrategia: filtrar pelo response do gateway que contiver URL S3 e baixar
// direto via context.request.get. Funciona em headed/headless igual e e
// independente do comportamento do browser pra PDF inline.
const RE_GATEWAY_DOWNLOAD = /la-prd-shared-services-cdx-api-gateway/;

// Operacao GraphQL que retorna a lista de documentos com URLs. Confirmado
// via captura ao vivo em 2026-05-16: response tem `data.documentSearch.results.documents[].documentUrl`,
// que aponta para Salesforce (gehealthcare-svc.my.salesforce.com/.../VersionData).
// NAO ha URL S3 no payload — o browser segue redirect Salesforce -> S3 quando
// renderiza, mas via context.request.get(documentUrl) com cookies da sessao
// Playwright o download funciona direto.
//
// Os documentos no array vem na MESMA ordem dos checkboxes do popup, entao
// usamos `indiceDocumento` (escolhido pelo nosso scraper) para pegar o
// documentUrl correto. NAO podemos matchar por id porque os ids do Salesforce
// rotacionam a cada chamada (memoria do projeto).
function extrairDocumentUrlDoPayload(payload, indice) {
  // Caminho preferencial: formato conhecido do documentSearch
  const docs = payload?.data?.documentSearch?.results?.documents;
  if (Array.isArray(docs) && docs.length > 0) {
    const idx = Math.min(indice ?? 0, docs.length - 1);
    if (typeof docs[idx]?.documentUrl === 'string' && docs[idx].documentUrl.startsWith('http')) {
      return docs[idx].documentUrl;
    }
  }
  // Fallback: busca recursiva por qualquer campo `documentUrl` no objeto
  function busca(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj.documentUrl === 'string' && obj.documentUrl.startsWith('http')) {
      return obj.documentUrl;
    }
    for (const v of Object.values(obj)) {
      const found = busca(v);
      if (found) return found;
    }
    return null;
  }
  return busca(payload);
}

// Tenta baixar UM documento, registrando timeline das etapas executadas.
// Retorna { ok, categoria, mensagem, etapas, duracaoMs, buffer? }.
// NUNCA lanca — falhas sao categorizadas no return.
async function tentarBaixarUmDocumento({ page, downloadBtn, indiceDocumento }) {
  const t = novaTimeline();
  try {
    // 1. Verifica se o botao Download eh visivel
    const visivel = await downloadBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    t.marcar('botao_visivel', { ok: visivel });
    if (!visivel) {
      const fim = t.finalizar();
      return {
        ok: false,
        categoria: CATEGORIAS_LOG.BOTAO_NAO_ENCONTRADO,
        mensagem: 'Botão Download não está visível no card.',
        etapas: fim.etapas,
        duracaoMs: fim.duracaoMs,
      };
    }

    // 2. Clica e tenta capturar download direto OU detectar popup
    const promiseDownload = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
    await downloadBtn.click().catch(() => {});
    t.marcar('botao_clicado');

    const downloadDireto = await promiseDownload;
    if (downloadDireto) {
      t.marcar('download_direto', { ok: true });
      const buffer = await lerStreamComoBuffer(await downloadDireto.createReadStream());
      t.marcar('buffer_lido', { bytes: buffer.length });
      const fim = t.finalizar();
      return {
        ok: true,
        categoria: CATEGORIAS_LOG.SUCESSO,
        mensagem: null,
        etapas: fim.etapas,
        duracaoMs: fim.duracaoMs,
        buffer,
        download: downloadDireto,
      };
    }

    // 3. Espera popup com timeout maior (SPA pesada, varia 0.5-8s)
    // POPUP_TIMEOUT_MS=30s e retorna assim que o popup aparece (nao espera 30s)
    const popupLocator = page.getByText(/fazer\s+o\s+download\s+dos\s+documentos/i).first();
    const popupAbriu = await popupLocator
      .waitFor({ state: 'visible', timeout: POPUP_TIMEOUT_MS })
      .then(() => true)
      .catch(() => false);
    t.marcar('popup_detectado', { ok: popupAbriu });

    if (!popupAbriu) {
      const fim = t.finalizar();
      return {
        ok: false,
        categoria: CATEGORIAS_LOG.POPUP_NAO_ABRIU,
        mensagem: 'Popup de download não abriu após click no botão.',
        etapas: fim.etapas,
        duracaoMs: fim.duracaoMs,
      };
    }

    // 4. Marca o checkbox correto
    const checkboxes = page.locator('input[type="checkbox"]');
    const total = await checkboxes.count();
    t.marcar('checkboxes_listados', { total });
    if (total === 0 || indiceDocumento >= total) {
      const fim = t.finalizar();
      return {
        ok: false,
        categoria: CATEGORIAS_LOG.POPUP_NAO_ABRIU,
        mensagem: `Popup sem checkboxes válidos (total=${total}, indice=${indiceDocumento}).`,
        etapas: fim.etapas,
        duracaoMs: fim.duracaoMs,
      };
    }
    for (let i = 0; i < total; i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isChecked()) await cb.uncheck().catch(() => {});
    }
    await checkboxes.nth(indiceDocumento).check().catch(() => {});
    t.marcar('checkbox_marcado', { indice: indiceDocumento });

    // 5. Clica DOWNLOAD do popup e intercepta o response do gateway que
    // contem a URL S3 pre-assinada. O portal NAO dispara download event —
    // ele abre o PDF via <a> (target=_blank), por isso waitForEvent('download')
    // nunca dispara. Veja comentario do extrairS3UrlDoPayload.
    //
    // Implementacao: page.on('response') coleta TODOS os responses do gateway
    // (sem ler body no listener — filter async do waitForResponse pode dar
    // problema consumindo bodies de responses irrelevantes). Polling de 500ms
    // le o body de cada candidato novo procurando URL S3.
    const botaoPopup = page.locator('button').filter({ hasText: /^(download|baixar)$/i }).last();

    const candidatos = [];
    const responseListener = (resp) => {
      if (resp.request().method() === 'POST'
          && RE_GATEWAY_DOWNLOAD.test(resp.url())
          && resp.status() === 200) {
        candidatos.push(resp);
      }
    };
    page.on('response', responseListener);

    let documentUrl = null;
    const lidos = new WeakSet();
    try {
      await botaoPopup.click().catch(() => {});
      t.marcar('botao_popup_clicado');

      const deadline = Date.now() + DOWNLOAD_TIMEOUT_MS;
      while (Date.now() < deadline && !documentUrl) {
        for (const resp of candidatos) {
          if (lidos.has(resp)) continue;
          lidos.add(resp);
          try {
            const txt = await resp.text();
            if (!txt.includes('documentUrl')) continue;
            let payload;
            try { payload = JSON.parse(txt); } catch { continue; }
            const url = extrairDocumentUrlDoPayload(payload, indiceDocumento);
            if (url) {
              documentUrl = url;
              t.marcar('document_url_extraida', { hasUrl: true });
              break;
            }
          } catch {
            // body ja consumido ou erro de leitura — ignora
          }
        }
        if (documentUrl) break;
        await sleep_ms(500);
      }
    } finally {
      page.off('response', responseListener);
    }

    if (!documentUrl) {
      t.marcar('gateway_sem_document_url', { candidatos: candidatos.length });

      // Diagnostico: loga prefix dos responses pra entender estrutura do
      // payload que o portal esta retornando.
      for (let i = 0; i < candidatos.length; i++) {
        try {
          const txt = await candidatos[i].text();
          const sample = (txt || '').slice(0, 800);
          console.log(`[GEHC_GATEWAY] body ${i+1}/${candidatos.length}: ${sample}`);
        } catch {}
      }

      const fim = t.finalizar();
      return {
        ok: false,
        categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
        mensagem: candidatos.length === 0
          ? `Timeout ${DOWNLOAD_TIMEOUT_MS / 1000}s sem responses do gateway (click pode nao ter disparado o POST).`
          : `Timeout ${DOWNLOAD_TIMEOUT_MS / 1000}s — ${candidatos.length} response(s) do gateway vistos, nenhum com documentUrl.`,
        etapas: fim.etapas,
        duracaoMs: fim.duracaoMs,
      };
    }
    // Baixa via documentUrl (Salesforce REST). A sessao Playwright tem os
    // cookies do Salesforce — request.get com followRedirects herda eles
    // e segue qualquer redirect interno (Salesforce -> S3 quando aplicavel).
    let pdfResp;
    try {
      pdfResp = await page.context().request.get(documentUrl, { timeout: 60_000 });
    } catch (err) {
      t.marcar('document_get_falhou', { erro: err.message?.slice(0, 100) });
      const fim = t.finalizar();
      return {
        ok: false,
        categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
        mensagem: `Falha baixando documentUrl: ${err.message?.slice(0, 150)}`,
        etapas: fim.etapas,
        duracaoMs: fim.duracaoMs,
      };
    }
    if (!pdfResp.ok()) {
      t.marcar('document_get_status', { status: pdfResp.status() });
      const fim = t.finalizar();
      return {
        ok: false,
        categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
        mensagem: `documentUrl retornou ${pdfResp.status()} ${pdfResp.statusText()}.`,
        etapas: fim.etapas,
        duracaoMs: fim.duracaoMs,
      };
    }

    const buffer = await pdfResp.body();
    t.marcar('buffer_lido', { bytes: buffer.length });

    const fim = t.finalizar();
    return {
      ok: true,
      categoria: CATEGORIAS_LOG.SUCESSO,
      mensagem: null,
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
      buffer,
    };
  } catch (err) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: categorizarErro(err.message),
      mensagem: err.message?.slice(0, 200) || 'Erro inesperado',
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }
}

function sleep_ms(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Wrapper com retry inline 3x + escalonamento + transient/permanent.
// Registra log estruturado por TENTATIVA (3 logs no caso de 3 falhas).
// Retorna { ok, ultimoResultado, tentativasFeitas }.
async function baixarComRetry({
  page, downloadBtn, doc, indice,
  tenantId, equipamento, ordem, trackingNumber,
}) {
  let ultimo = null;
  for (let tentativa = 1; tentativa <= RETRY_INLINE_MAX; tentativa++) {
    if (tentativa > 1) {
      const espera = RETRY_BACKOFF_MS[tentativa - 1] || 60_000;
      console.log(`[GEHC_DOWNLOAD] ${doc.documentId} tentativa ${tentativa}/${RETRY_INLINE_MAX} apos ${espera / 1000}s...`);
      await sleep_ms(espera);
    }

    const r = await tentarBaixarUmDocumento({ page, downloadBtn, indiceDocumento: indice });
    ultimo = r;

    // Log estruturado dessa tentativa
    await registrarLog({
      tenantId,
      documentId: doc.documentId,
      fileName: doc.fileName,
      equipamentoId: equipamento.id,
      ordemServicoId: ordem.id,
      trackingNumber,
      categoria: r.categoria,
      mensagem: r.mensagem,
      etapas: r.etapas,
      duracaoMs: r.duracaoMs,
      tentativaN: tentativa,
    });

    if (r.ok) return { ok: true, ultimoResultado: r, tentativasFeitas: tentativa };

    // Permanente — nao adianta retry inline
    if (CATEGORIAS_PERMANENTES.has(r.categoria)) {
      console.log(`[GEHC_DOWNLOAD] ${doc.documentId}: erro permanente ${r.categoria}, abortando retry.`);
      return { ok: false, ultimoResultado: r, tentativasFeitas: tentativa };
    }

    // Sessao perdida — nao adianta retry sem novo auth.
    // Volta pro caller que decide se re-autentica e continua, ou aborta.
    if (CATEGORIAS_REAUTH.has(r.categoria)) {
      console.log(`[GEHC_DOWNLOAD] ${doc.documentId}: sessao perdida, retry inline interrompido.`);
      return { ok: false, ultimoResultado: r, tentativasFeitas: tentativa, requerReauth: true };
    }
  }
  return { ok: false, ultimoResultado: ultimo, tentativasFeitas: RETRY_INLINE_MAX };
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

async function capturarPdfsDeEquipamento({ context, tenantId, equipamento, ordens, tokens, contadorFalhasConsecutivas }) {
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

        // Guard de idempotencia por OS: o portal GE retorna documentIds NOVOS
        // a cada chamada do documentSearch (mesmo PDF logico, ID novo). A
        // idempotencia interna abaixo eh por documentId, entao nao protege
        // contra execucoes concorrentes. Aqui pulamos a OS inteira se ela ja
        // tem QUALQUER doc baixado — economiza GraphQL + Playwright + LLM.
        const jaTemBaixadoNaOs = await prisma.gehcPdfDocumento.count({
          where: { ordemServicoId: ordem.id, baixadoEm: { not: null } },
        });
        if (jaTemBaixadoNaOs > 0) {
          continue;
        }

        // Resolve documentos do GraphQL (idempotencia + filename real).
        let docsPendentes = [];
        try {
          const docs = await listarDocumentosDaOS({
            serviceRequestNumber: trackingNumber,
            accessToken: tokens?.accessToken,
            idToken: tokens?.idToken,
          });
          if (docs.length) {
            // 1. Pula docs ja baixados (sucesso final)
            // 2. Circuit breaker: pula docs com >=5 tentativas falhando se a
            //    ultima tentativa foi ha menos de 7 dias. Apos 7 dias volta
            //    a tentar — pode ter se resolvido o problema do lado do GE.
            const idsRecorrentes = docs.map((d) => d.documentId);
            const registros = await prisma.gehcPdfDocumento.findMany({
              where: { documentId: { in: idsRecorrentes } },
              select: {
                documentId: true,
                baixadoEm: true,
                tentativas: true,
                ultimaTentativaEm: true,
              },
            });
            const limiteQuarentena = new Date();
            limiteQuarentena.setDate(limiteQuarentena.getDate() - CIRCUIT_BREAKER_DIAS_QUARENTENA);
            const skipSet = new Set();
            const quarentena = [];
            for (const r of registros) {
              if (r.baixadoEm) { skipSet.add(r.documentId); continue; }
              if (
                (r.tentativas ?? 0) >= CIRCUIT_BREAKER_TENTATIVAS &&
                r.ultimaTentativaEm && r.ultimaTentativaEm > limiteQuarentena
              ) {
                skipSet.add(r.documentId);
                quarentena.push(r.documentId);
              }
            }
            if (quarentena.length > 0) {
              console.log(
                `[GEHC_PDF] SR${trackingNumber}: ${quarentena.length} doc(s) em quarentena (>=${CIRCUIT_BREAKER_TENTATIVAS} tentativas, voltam a tentar apos ${CIRCUIT_BREAKER_DIAS_QUARENTENA}d): ${quarentena.join(', ')}`
              );
            }
            docsPendentes = docs.filter((d) => !skipSet.has(d.documentId));
          }
        } catch (err) {
          erros.push(`SR${trackingNumber}: documentSearch ${err.message}`);
          continue;
        }

        if (!docsPendentes.length) continue; // nada a fazer

        // Cada OS GE pode ter varios documentos (Service Report, Activity
        // Sheet, etc), todos com conteudo praticamente identico. Para a IA
        // 1 PDF por OS basta — economiza download, R2 nao usado mas storage
        // do banco fica menor, evita duplicacao no drill-down.
        // listarDocumentosDaOS retorna em ordem de relevancia do portal,
        // entao o primeiro eh o mais informativo (Service Report).
        if (docsPendentes.length > 1) {
          console.log(
            `[GEHC_PDF] SR${trackingNumber}: ${docsPendentes.length} documentos disponiveis, baixando so o primeiro (${docsPendentes[0].documentId}).`
          );
          docsPendentes = docsPendentes.slice(0, 1);
        }

        // Botao Download esta no .ge-equipment-service-history__holder do card.
        const downloadBtn = item.locator('.ge-equipment-service-history__holder button')
          .filter({ hasText: /^(download|baixar)$/i }).first();

        // Para cada documento pendente da OS — usa wrapper com retry inline
        // 3x + log estruturado por tentativa + transient/permanent.
        for (let i = 0; i < docsPendentes.length; i++) {
          const doc = docsPendentes[i];
          processadas++;

          const retryResult = await baixarComRetry({
            page, downloadBtn, doc, indice: i,
            tenantId, equipamento, ordem, trackingNumber,
          });

          if (retryResult.ok) {
            // SUCESSO — persiste documento, dispara extracao inline,
            // marca logs anteriores desse documentId como resolvidos
            const r = retryResult.ultimoResultado;
            const fileName = doc.fileName || (r.download ? r.download.suggestedFilename() : 'sem_nome.pdf');
            const fileHash = crypto.createHash('sha256').update(r.buffer).digest('hex');

            const pdfDocumento = await prisma.gehcPdfDocumento.upsert({
              where: { documentId: doc.documentId },
              create: {
                tenantId, equipamentoId: equipamento.id, ordemServicoId: ordem.id,
                documentId: doc.documentId, fileName, fileHash,
                fileSizeBytes: r.buffer.length, r2Key: null,
                baixadoEm: new Date(),
                tentativas: retryResult.tentativasFeitas,
                ultimaTentativaEm: new Date(), ultimoErro: null,
              },
              update: {
                fileName, fileHash, fileSizeBytes: r.buffer.length, r2Key: null,
                baixadoEm: new Date(),
                tentativas: { increment: retryResult.tentativasFeitas },
                ultimaTentativaEm: new Date(), ultimoErro: null,
              },
            });

            try {
              const ext = await extrairUmPdf({ pdfDocumento, buffer: r.buffer });
              if (!ext.ok) console.warn(`[GEHC_DOWNLOAD] ${doc.documentId}: extracao inline falhou — ${ext.erro}`);
            } catch (extErr) {
              console.error(`[GEHC_DOWNLOAD] ${doc.documentId}: erro extracao:`, extErr.message);
            }

            await marcarComoResolvido({ tenantId, documentId: doc.documentId });
            capturados++;
            // Reset do contador de falhas consecutivas — voltou a funcionar
            if (contadorFalhasConsecutivas) contadorFalhasConsecutivas.value = 0;
            continue;
          }

          // FALHA apos retry — atualiza pdfDocumento + incrementa contador
          const r = retryResult.ultimoResultado;
          const erroAmigavel = r.mensagem || 'Falha desconhecida.';
          erros.push(`${doc.documentId}: ${r.categoria} — ${erroAmigavel}`);

          await prisma.gehcPdfDocumento.upsert({
            where: { documentId: doc.documentId },
            create: {
              tenantId, equipamentoId: equipamento.id, ordemServicoId: ordem.id,
              documentId: doc.documentId, fileName: doc.fileName,
              tentativas: retryResult.tentativasFeitas,
              ultimaTentativaEm: new Date(),
              ultimoErro: `[${r.categoria}] ${erroAmigavel}`.slice(0, 500),
            },
            update: {
              tentativas: { increment: retryResult.tentativasFeitas },
              ultimaTentativaEm: new Date(),
              ultimoErro: `[${r.categoria}] ${erroAmigavel}`.slice(0, 500),
            },
          }).catch(() => {});

          // Detector de FALHA_SISTEMICA: incrementa contador de falhas
          // consecutivas. Se atingir limite, sinaliza pra cima quebrar
          // a execucao (evita gastar Playwright em problema sistemico).
          if (contadorFalhasConsecutivas) {
            contadorFalhasConsecutivas.value++;
            if (contadorFalhasConsecutivas.value >= FALHAS_CONSECUTIVAS_PARA_SISTEMICO) {
              console.error(
                `[GEHC_DOWNLOAD] FALHA_SISTEMICA detectada — ${contadorFalhasConsecutivas.value} docs consecutivos falharam todas as ${RETRY_INLINE_MAX} tentativas. Quebrando execucao.`
              );
              await registrarLog({
                tenantId,
                categoria: CATEGORIAS_LOG.FALHA_SISTEMICA,
                mensagem: `${contadorFalhasConsecutivas.value} docs consecutivos falharam todas as ${RETRY_INLINE_MAX} tentativas. Provavel sessao perdida, layout do portal mudou ou portal fora do ar.`,
              });
              return { capturados, processadas, falhaSistemica: true, erro: erros.join(' | ').slice(0, 500) };
            }
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
 * @param {number} [opts.diasAtras=365]
 * @param {number} [opts.limite=50] - número máximo TOTAL de OSs por execução
 * @param {number} [opts.maxPorEquipamento=5] - cap de OSs por equipamento por execução
 */
export async function executarBackfillPdfs({
  tenantId,
  modalidades,
  diasAtras = 365,
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
      // Pula equipamentos Vendidos ou Desativados — sem captura de PDF.
      status: { notIn: ['Vendido', 'Desativado'] },
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

  // Contador compartilhado pra detectar FALHA_SISTEMICA — quebra a execucao
  // quando N docs CONSECUTIVOS falham todas as 3 tentativas. Suceso reseta.
  const contadorFalhasConsecutivas = { value: 0 };
  let falhouSistemica = false;

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
        contadorFalhasConsecutivas,
      });

      processadas += resultado.processadas || 0;
      capturados  += resultado.capturados  || 0;

      const tag = equipamento.tag || equipamento.id;
      console.log(
        `[GEHC_PDF] Equipamento ${tag}: ${resultado.capturados} PDF(s) capturados ` +
        `(${resultado.processadas} processadas de ${ordensDoEquipamento.length} OSs pendentes)` +
        `${resultado.erro ? ` · erro: ${resultado.erro}` : ''}`
      );

      // Detector de falha sistemica acionado dentro do equipamento — quebra
      // o loop sem desperdicar Playwright em mais equipamentos. Alerta sera
      // criado pelo orchestrator que chama essa funcao.
      if (resultado.falhaSistemica) {
        falhouSistemica = true;
        console.error(`[GEHC_PDF] Backfill abortado por FALHA_SISTEMICA no tenant ${tenantId}.`);
        break;
      }

      await sleep(RATE_LIMIT_OS_MS);
    }
  } finally {
    await session.browser.close().catch(() => {});
  }

  console.log(
    `[GEHC_PDF] Backfill concluido tenant=${tenantId}: ${processadas} OS(s) processadas, ${capturados} PDF(s) capturados${falhouSistemica ? ' · FALHA_SISTEMICA' : ''}.`
  );

  // Alerta interno (sino do SIMEC, sem Telegram). Idempotente — atualiza
  // alerta unico por tenant. Auto-resolve quando a captura volta a funcionar.
  if (falhouSistemica) {
    await dispararAlertaFalhaSistemica({
      tenantId,
      mensagem: `Execução abortada após ${contadorFalhasConsecutivas.value} falhas consecutivas. Possíveis causas: sessão GE expirada, layout do portal mudou, ou portal indisponível. Veja /api/gehc/aprendizado/extracoes/diagnostico.`,
      qtdConsecutivas: contadorFalhasConsecutivas.value,
    });
  } else if (capturados > 0) {
    // Captura voltou a funcionar — limpa alerta antigo (se houver)
    await resolverAlertaFalhaSistemica({ tenantId });
  }

  return { processadas, capturados, falhaSistemica: falhouSistemica };
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
