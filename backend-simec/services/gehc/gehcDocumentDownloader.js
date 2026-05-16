// Captura PDFs de OS GE via chamada direta ao gateway GraphQL CDX + GET HTTP.
//
// Arquitetura (refatoracao 2026-05-16, ver [[ADR-019]]):
//   1. listarDocumentosDaOS (gehcDocumentClient.js) chama getDocumentSearch
//      no gateway — retorna documents[] com documentUrl + documentSource.
//   2. Para cada documento, baixarDocumentoViaUrl faz GET HTTP direto:
//        - documentSource '102' (API GE / Preventive Maintenance Form)
//          -> https://prod-api.gehealthcare.com/health/smaxCdrSIMS/...
//          -> headers: accesstoken + idtoken (mesmo do gateway)
//        - documentSource '101' (Salesforce / Service Report)
//          -> https://gehealthcare-svc.my.salesforce.com/services/data/.../VersionData
//          -> headers: Authorization Bearer accessToken (Salesforce session ID)
//   3. Buffer recebido roda inline em extrairUmPdf() (Camada 1 regex + Camada 2 LLM).
//
// Por que Playwright continua? Apenas para AUTH inicial — gehcAuthService usa
// Playwright pra capturar accesstoken+idtoken via intercept de queries CDX no
// login. Apos isso os tokens ficam no banco e o downloader nao precisa abrir
// browser. abrirSessaoAutenticada eh mantida como helper opcional para casos
// onde queremos cookies Salesforce (fallback se Bearer falhar).
//
// Armazenamento: o binario do PDF NAO eh persistido em R2 (decisao anterior).
// O buffer roda inline pela extracao Camada 1 + Camada 2 e e' descartado.
// gehcPdfDocumento eh gravado com baixadoEm para dedup, mas r2Key=null.
//
// LGPD: Camada 1 (regex) extrai campos identificaveis (engineerFullName,
// serialNumber) que ficam tenant-scoped. Apenas Camada 2 (LLM, despersonalizada
// por design do prompt) pode subir pro Knowledge Agent global. Ver
// [[ADR-018 - Knowledge Agent global cross-tenant e Operational Agents tenant-scoped]].

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

const RATE_LIMIT_OS_MS     = 1_000;   // espera entre OSs no mesmo tenant (HTTP é rápido)
const RATE_LIMIT_TENANT_MS = 10_000;  // espera entre tenants
const HTTP_TIMEOUT_MS      = 60_000;  // timeout do GET HTTP por PDF

// Circuit breaker — apos N tentativas consecutivas falhando, "quarentena"
// o documento por X dias. Evita gastar requests todo ciclo tentando docs
// que provavelmente estao com problema permanente no portal GE
// (S3 expirado, OS marcada como restrita, PDF corrompido, etc).
const CIRCUIT_BREAKER_TENTATIVAS = 10;       // mais permissivo (3 inline x ~3 ciclos)
const CIRCUIT_BREAKER_DIAS_QUARENTENA = 7;

// Retry inline por documento dentro de uma execucao. Backoff curto agora
// que e' HTTP (nao Playwright) — falha rapido.
const RETRY_INLINE_MAX = 3;
const RETRY_BACKOFF_MS = [0, 2_000, 5_000];

// Detector inline de falha sistemica: se N docs CONSECUTIVOS esgotam
// suas 3 tentativas, eh provavel problema maior (auth expirada, portal
// fora). Quebra a execucao e gera alerta interno (sem Telegram).
const FALHAS_CONSECUTIVAS_PARA_SISTEMICO = 3;

// Categorias de erro PERMANENTE — nao adianta fazer retry inline.
const CATEGORIAS_PERMANENTES = new Set([
  'BOTAO_NAO_ENCONTRADO',  // legado, nao usado mais; mantido p/ compat de logs
  'NAO_E_PDF',             // response veio mas nao e PDF (HTML de erro)
  'DOC_SEM_URL',           // gateway retornou doc sem documentUrl
  'SALESFORCE_AUTH_FALHA', // 401 em source 101 — token CDX nao destrava Salesforce
                           // direto. Pula o doc, NAO aborta tenant (outros docs
                           // podem ser source 102 que funciona).
]);

// Categorias que se beneficiam de re-login inline (nao adianta retry sem auth).
const CATEGORIAS_REAUTH = new Set([
  'SESSAO_PERDIDA',
  'AUTH_EXPIRADA',         // 401 em source 102 (gateway/API GE) — token de fato expirou
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Valida que o buffer começa com %PDF (magic bytes). Salesforce pode retornar
// HTML de erro com status 200 se a sessao caiu, ou JSON de erro do API GE.
function validarPdfBuffer(buffer) {
  if (!buffer || buffer.length < 4) return false;
  // Magic bytes "%PDF" = [0x25, 0x50, 0x44, 0x46]
  return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
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
//
// O portal GE retorna o `documentUrl` direto na resposta do gateway. Bastam:
//   - GET HTTP no documentUrl
//   - Headers de auth corretos (varia por documentSource)
//   - Validar magic bytes %PDF no buffer recebido
//
// Não precisa abrir popup, clicar em botão, marcar checkbox.

// Baixa o PDF de um documento via documentUrl direto.
// Dispatcher por documentSource (capturado em 2026-05-16):
//   - '102': API GE (prod-api.gehealthcare.com) — accesstoken + idtoken no header
//   - '101': Salesforce — Authorization Bearer accessToken (Salesforce session ID)
//   - outros: erro permanente (DOC_SEM_URL ou desconhecido)
//
// Usa context.request.get que herda cookies do contexto Playwright (caso
// algum cookie de sessao Salesforce ajude no caso 101) e permite headers
// customizados.
async function baixarDocumentoViaUrl({ doc, context, tokens }) {
  const t = novaTimeline();

  if (!doc.documentUrl) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: 'DOC_SEM_URL',
      mensagem: 'Gateway retornou documento sem documentUrl.',
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }
  if (!tokens?.accessToken || !tokens?.idToken) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: 'AUTH_EXPIRADA',
      mensagem: 'Tokens GE indisponiveis para download.',
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }

  // Headers por source:
  //   '102' (API GE):    accesstoken + idtoken nos headers (mesmo do gateway)
  //   '101' (Salesforce): Cookie sid=<accessToken>. Confirmado em prod 2026-05-16:
  //                        Authorization Bearer retorna 401. Salesforce historicamente
  //                        aceita o session ID no cookie sid no dominio my.salesforce.com.
  //                        Bearer tambem incluido como fallback secundario.
  const headersBase = {
    'accept':       'application/pdf, */*',
    'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer':      'https://www.gehealthcare.com.br/',
  };
  let headers;
  if (doc.documentSource === '101') {
    // Salesforce — session id via Cookie + Bearer como fallback
    headers = {
      ...headersBase,
      'Cookie':        `sid=${tokens.accessToken}`,
      'Authorization': `Bearer ${tokens.accessToken}`,
    };
  } else if (doc.documentSource === '102') {
    // API GE direta — mesmos headers do gateway
    headers = {
      ...headersBase,
      'accesstoken': tokens.accessToken,
      'idtoken':     tokens.idToken,
    };
  } else {
    // Source desconhecido — tenta todos os formatos
    headers = {
      ...headersBase,
      'Cookie':        `sid=${tokens.accessToken}`,
      'Authorization': `Bearer ${tokens.accessToken}`,
      'accesstoken':   tokens.accessToken,
      'idtoken':       tokens.idToken,
    };
  }
  t.marcar('headers_montados', { source: doc.documentSource });

  let resp;
  try {
    resp = await context.request.get(doc.documentUrl, {
      headers,
      timeout: HTTP_TIMEOUT_MS,
    });
  } catch (err) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: categorizarErro(err.message),
      mensagem: `Falha de rede no GET: ${err.message?.slice(0, 200)}`,
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }

  const status = resp.status();
  t.marcar('http_response', { status });

  if (status === 401 || status === 403) {
    // Fallback para source 101 (Salesforce): tenta navegacao real via Playwright.
    // O context tem cookies do my.salesforce.com setados durante o SSO no login,
    // que o context.request.get pode nao enviar cross-domain. Navegacao real
    // do browser segue cookies + redirects automaticamente.
    if (doc.documentSource === '101') {
      // Debug: loga cookies disponiveis pro dominio do Salesforce — ajuda
      // diagnosticar se SSO setou cookies de sessao no contexto.
      try {
        const cookies = await context.cookies(doc.documentUrl);
        t.marcar('salesforce_cookies', {
          quantidade: cookies.length,
          nomes: cookies.map((c) => c.name).slice(0, 5).join(','),
        });
      } catch {}

      try {
        const newPage = await context.newPage();
        try {
          const navResp = await newPage.goto(doc.documentUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000,
          });
          if (navResp && navResp.ok()) {
            const navBuffer = await navResp.body();
            if (validarPdfBuffer(navBuffer)) {
              t.marcar('salesforce_navegacao_ok', { bytes: navBuffer.length });
              const fim = t.finalizar();
              return {
                ok: true,
                categoria: CATEGORIAS_LOG.SUCESSO,
                mensagem: null,
                etapas: fim.etapas,
                duracaoMs: fim.duracaoMs,
                buffer: navBuffer,
              };
            }
          }
          t.marcar('salesforce_navegacao_falhou', {
            status: navResp?.status() || null,
          });
        } finally {
          await newPage.close().catch(() => {});
        }
      } catch (navErr) {
        t.marcar('salesforce_navegacao_erro', { erro: navErr.message?.slice(0, 100) });
      }
    }

    const fim = t.finalizar();
    // Distingue: 401 em source 101 e' problema localizado do Salesforce
    // (nosso token CDX nao destrava Salesforce direto). 401 em 102 e' o
    // token CDX expirado (gateway tambem rejeitaria) — aborta tenant.
    const categoria = doc.documentSource === '101' ? 'SALESFORCE_AUTH_FALHA' : 'AUTH_EXPIRADA';
    const origem = doc.documentSource === '101' ? 'Salesforce' : 'API GE';
    return {
      ok: false,
      categoria,
      mensagem: `${origem} retornou HTTP ${status} (auth invalida).`,
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }
  if (status === 404) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: 'BOTAO_NAO_ENCONTRADO',  // reusa categoria permanente — doc nao existe mais
      mensagem: `Documento nao encontrado (HTTP 404): ${doc.documentUrl?.slice(0, 100)}`,
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }
  if (status >= 500 || status === 429) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
      mensagem: `Backend retornou HTTP ${status} (transient).`,
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }
  if (status !== 200) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
      mensagem: `HTTP ${status} inesperado.`,
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }

  let buffer;
  try {
    buffer = await resp.body();
  } catch (err) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: categorizarErro(err.message),
      mensagem: `Falha lendo body: ${err.message?.slice(0, 150)}`,
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }

  if (!validarPdfBuffer(buffer)) {
    // Pode ser HTML de erro do Salesforce ou JSON de erro da API GE — nao retry
    const inicio = (buffer || Buffer.alloc(0)).slice(0, 60).toString('utf8').replace(/[^\x20-\x7e]/g, '·');
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: 'NAO_E_PDF',
      mensagem: `Response 200 mas nao e PDF. Primeiros bytes: ${inicio.slice(0, 80)}`,
      etapas: fim.etapas,
      duracaoMs: fim.duracaoMs,
    };
  }
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
}

function sleep_ms(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Wrapper com retry inline 3x + escalonamento + transient/permanent.
// Registra log estruturado por TENTATIVA (3 logs no caso de 3 falhas).
// Retorna { ok, ultimoResultado, tentativasFeitas }.
async function baixarComRetry({
  doc, context, tokens,
  tenantId, equipamento, ordem, trackingNumber,
}) {
  let ultimo = null;
  for (let tentativa = 1; tentativa <= RETRY_INLINE_MAX; tentativa++) {
    if (tentativa > 1) {
      const espera = RETRY_BACKOFF_MS[tentativa - 1] || 5_000;
      console.log(`[GEHC_DOWNLOAD] ${doc.documentId} tentativa ${tentativa}/${RETRY_INLINE_MAX} apos ${espera / 1000}s...`);
      await sleep_ms(espera);
    }

    const r = await baixarDocumentoViaUrl({ doc, context, tokens });
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

// ─── Captura de todas as OSs de um equipamento (chamadas HTTP) ──────────────
//
// Refatorado em 2026-05-16 (ADR-019): não navega mais pela lista de OSs no
// portal. Para cada OS pendente, chama listarDocumentosDaOS (GraphQL gateway)
// + baixarDocumentoViaUrl (GET HTTP direto). Sem DOM, sem popup, sem click.

async function capturarPdfsDeEquipamento({ context, tenantId, equipamento, ordens, tokens, contadorFalhasConsecutivas }) {
  if (!ordens.length) return { capturados: 0, processadas: 0, erro: null };

  let capturados = 0;
  let processadas = 0;
  const erros = [];

  // Ordens já vem com trackingNumber preenchido — filtra inválidas.
  const ordensComTracking = ordens.filter((o) => o.trackingNumber);
  if (ordensComTracking.length === 0) {
    return { capturados: 0, processadas: 0, erro: 'nenhuma_os_com_tracking_number' };
  }

  const tag = equipamento.tag || equipamento.id;
  console.log(`[GEHC_PDF] ${tag}: processando ${ordensComTracking.length} OS(s) via gateway.`);

  for (const ordem of ordensComTracking) {
    try {
      const trackingNumber = String(ordem.trackingNumber);

      // Guard de idempotencia por OS: documentIds rotacionam entre chamadas
      // do gateway (memoria do projeto). Pula a OS inteira se ja tem
      // qualquer documento baixado — economiza gateway + HTTP + LLM.
      const jaTemBaixadoNaOs = await prisma.gehcPdfDocumento.count({
        where: { ordemServicoId: ordem.id, baixadoEm: { not: null } },
      });
      if (jaTemBaixadoNaOs > 0) continue;

      // Lista documentos da OS via gateway GraphQL (com retry interno).
      let docsBrutos;
      try {
        docsBrutos = await listarDocumentosDaOS({
          serviceRequestNumber: trackingNumber,
          accessToken: tokens?.accessToken,
          idToken: tokens?.idToken,
        });
      } catch (err) {
        erros.push(`SR${trackingNumber}: documentSearch ${err.message}`);
        continue;
      }
      if (!docsBrutos.length) continue;

      // Circuit breaker: pula docs com >=10 tentativas falhas nos ultimos 7d.
      // Apos 7d volta a tentar — pode ter resolvido no lado do GE.
      const idsRecorrentes = docsBrutos.map((d) => d.documentId);
      const registros = await prisma.gehcPdfDocumento.findMany({
        where: { documentId: { in: idsRecorrentes } },
        select: {
          documentId: true, baixadoEm: true,
          tentativas: true, ultimaTentativaEm: true,
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
          `[GEHC_PDF] SR${trackingNumber}: ${quarentena.length} doc(s) em quarentena (>=${CIRCUIT_BREAKER_TENTATIVAS} tentativas, voltam apos ${CIRCUIT_BREAKER_DIAS_QUARENTENA}d): ${quarentena.join(', ')}`
        );
      }
      const docsPendentes = docsBrutos.filter((d) => !skipSet.has(d.documentId));
      if (!docsPendentes.length) continue;

      // Baixa TODOS os documentos da OS — Manutencoes Planejadas tipicamente
      // tem 2 docs (Service Report Salesforce + PM Form API GE), e ambos
      // agregam valor distinto pra IA. Cap defensivo de 5 por OS para casos
      // anomalos sem ficar sem rate-limit por OS.
      //
      // Ordena source 102 (API GE) antes de 101 (Salesforce). 102 e' o caminho
      // simples; 101 depende de cookies Salesforce. Se um doc 101 falhar com
      // SALESFORCE_AUTH_FALHA, ele e' marcado como permanente mas seguimos
      // para o proximo doc 102 (que provavelmente funciona).
      const MAX_DOCS_POR_OS = 5;
      const docsOrdenados = [...docsPendentes].sort((a, b) => {
        const prioridade = { '102': 0, '101': 1 };
        return (prioridade[a.documentSource] ?? 2) - (prioridade[b.documentSource] ?? 2);
      });
      const docsParaBaixar = docsOrdenados.slice(0, MAX_DOCS_POR_OS);
      if (docsPendentes.length > MAX_DOCS_POR_OS) {
        console.log(
          `[GEHC_PDF] SR${trackingNumber}: ${docsPendentes.length} documentos disponiveis, baixando apenas os primeiros ${MAX_DOCS_POR_OS}.`
        );
      }

      // Loop pelos documentos pendentes — usa wrapper com retry inline + log estruturado.
      for (const doc of docsParaBaixar) {
        processadas++;

        const retryResult = await baixarComRetry({
          doc, context, tokens,
          tenantId, equipamento, ordem, trackingNumber,
        });

        if (retryResult.ok) {
          const r = retryResult.ultimoResultado;
          const fileName = doc.fileName || 'sem_nome.pdf';
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
          if (contadorFalhasConsecutivas) contadorFalhasConsecutivas.value = 0;
          continue;
        }

        // FALHA apos retry — atualiza tentativas + ultimoErro
        const r = retryResult.ultimoResultado || {};
        const erroAmigavel = r.mensagem || 'Falha desconhecida.';
        erros.push(`${doc.documentId}: ${r.categoria || 'ERRO'} — ${erroAmigavel}`);

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

        // Detector de FALHA_SISTEMICA: se reauth necessario OU N docs
        // consecutivos falharam, quebra a execucao. NAO conta erros
        // permanentes (SALESFORCE_AUTH_FALHA, NAO_E_PDF, etc.) — esses sao
        // problemas localizados de doc, nao indicam portal fora.
        if (retryResult.requerReauth) {
          console.error(
            `[GEHC_DOWNLOAD] ${doc.documentId}: requer reauth, abortando captura do tenant.`
          );
          await registrarLog({
            tenantId,
            categoria: CATEGORIAS_LOG.FALHA_SISTEMICA,
            mensagem: 'Auth GE expirada — necessario re-autenticar antes de continuar.',
          });
          return { capturados, processadas, falhaSistemica: true, erro: erros.join(' | ').slice(0, 500) };
        }

        if (contadorFalhasConsecutivas && !CATEGORIAS_PERMANENTES.has(r.categoria)) {
          contadorFalhasConsecutivas.value++;
          if (contadorFalhasConsecutivas.value >= FALHAS_CONSECUTIVAS_PARA_SISTEMICO) {
            console.error(
              `[GEHC_DOWNLOAD] FALHA_SISTEMICA detectada — ${contadorFalhasConsecutivas.value} docs consecutivos falharam todas as ${RETRY_INLINE_MAX} tentativas.`
            );
            await registrarLog({
              tenantId,
              categoria: CATEGORIAS_LOG.FALHA_SISTEMICA,
              mensagem: `${contadorFalhasConsecutivas.value} docs consecutivos falharam todas as ${RETRY_INLINE_MAX} tentativas. Provavel auth expirada ou gateway fora do ar.`,
            });
            return { capturados, processadas, falhaSistemica: true, erro: erros.join(' | ').slice(0, 500) };
          }
        }
      }
    } catch (err) {
      erros.push(`OS ${ordem.trackingNumber || ordem.id}: ${err.message?.slice(0, 100)}`);
    }
  }

  return { capturados, processadas, erro: erros.length ? erros.join(' | ').slice(0, 500) : null };
}
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
