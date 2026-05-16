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
import { listarDocumentosDaOS, dispararDownload } from './gehcDocumentClient.js';
import { GehcSubscriptionClient } from './gehcSubscriptionClient.js';
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

  // Visita explicita ao Salesforce my.salesforce.com pra ESTABELECER cookies
  // de sessao SSO no contexto desse dominio. Sem isso, qualquer GET subsequente
  // a documentUrl Salesforce (gehealthcare-svc.my.salesforce.com/.../VersionData)
  // bate em 401, mesmo com tokens CDX. Este passo dispara o redirect SSO
  // (login.salesforce.com -> my.salesforce.com -> volta), populando cookies.
  try {
    await page.goto('https://gehealthcare-svc.my.salesforce.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    // Espera pequena pra SSO redirect terminar de setar cookies.
    await page.waitForTimeout(3_000);
    console.log('[GEHC_AUTH] Visita ao my.salesforce.com concluida.');
  } catch (err) {
    console.warn(`[GEHC_AUTH] Falha visitando Salesforce: ${err.message?.slice(0, 100)}`);
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

// ─── Download de um documento específico (HTTP mutation + WS subscription + GET S3) ──
// Baixa o PDF de um documento via fluxo WS (graphql-transport-ws).
//
// Mapeado ao vivo em 2026-05-16 (ver [[ADR-019]]):
//   1. Reserva proxima slot do WS (FIFO) ANTES da mutation pra evitar corrida.
//   2. Chama mutation downloadDocument no gateway -> retorna {status:202}
//      (sem URL — backend processa async).
//   3. ~5.8s depois, WS push {preSignedUrl, email} chega via subscription
//      documentDownloadSubscription -> resolve a promise reservada.
//   4. GET na preSignedUrl S3 (sem auth — assinada na query string).
//   5. Valida magic bytes %PDF e retorna buffer.
//
// IMPORTANTE: o worker NUNCA bate em gehealthcare-svc.my.salesforce.com.
// O backend GE tem credenciais de Connected App no Salesforce e faz o
// handoff via mutation. Tentar GET direto no documentUrl Salesforce sempre
// retorna 401 porque o token CDX nao destrava Salesforce.
async function baixarDocumentoViaUrl({ doc, tokens, wsClient }) {
  const t = novaTimeline();

  if (!doc.documentUrl) {
    const fim = t.finalizar();
    return {
      ok: false, categoria: 'DOC_SEM_URL',
      mensagem: 'Gateway retornou documento sem documentUrl.',
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }
  if (!tokens?.accessToken || !tokens?.idToken) {
    const fim = t.finalizar();
    return {
      ok: false, categoria: 'AUTH_EXPIRADA',
      mensagem: 'Tokens GE indisponiveis para download.',
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }
  if (!wsClient) {
    const fim = t.finalizar();
    return {
      ok: false, categoria: 'AUTH_EXPIRADA',
      mensagem: 'WS client GEHC nao inicializado (necessario para preSignedUrl).',
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }

  // 1. Reserva slot WS ANTES de disparar a mutation (evita corrida onde o
  //    push chega antes do resolver ser registrado).
  const promiseUrl = wsClient.esperarProximaUrl(60_000);
  t.marcar('ws_slot_reservado');

  // 2. Dispara mutation downloadDocument no gateway.
  let disparo;
  try {
    disparo = await dispararDownload({
      doc,
      accessToken: tokens.accessToken,
      idToken:     tokens.idToken,
    });
    t.marcar('download_mutation_ok', { status: disparo.status });
  } catch (err) {
    // Libera o slot WS reservado (que nunca vai receber resposta).
    promiseUrl.catch(() => {});
    const fim = t.finalizar();
    const isAuth = /HTTP 40[13]|auth/i.test(err.message || '');
    return {
      ok: false,
      categoria: isAuth ? 'AUTH_EXPIRADA' : CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
      mensagem: `downloadDocument falhou: ${err.message?.slice(0, 200)}`,
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }

  if (disparo.status !== 202 && disparo.status !== 200) {
    promiseUrl.catch(() => {});
    const fim = t.finalizar();
    return {
      ok: false, categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
      mensagem: `downloadDocument status ${disparo.status}: ${disparo.message?.slice(0, 150)}`,
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }

  // 3. Aguarda push WS com preSignedUrl (timeout 60s; portal real demora ~6s).
  let preSignedUrl;
  try {
    preSignedUrl = await promiseUrl;
    t.marcar('ws_url_recebida');
  } catch (err) {
    const fim = t.finalizar();
    const isTimeout = err.message === 'WS_TIMEOUT';
    return {
      ok: false,
      categoria: isTimeout ? CATEGORIAS_LOG.TIMEOUT_DOWNLOAD : 'AUTH_EXPIRADA',
      mensagem: isTimeout
        ? 'WS nao recebeu preSignedUrl em 60s (backend GE pode estar lento).'
        : `WS subscription falhou: ${err.message?.slice(0, 150)}`,
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }

  // 4. GET na S3 — URL assinada na query string, sem auth header.
  let resp;
  try {
    resp = await fetch(preSignedUrl, {
      method: 'GET',
      headers: { 'accept': 'application/pdf, */*' },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch (err) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: categorizarErro(err.message),
      mensagem: `Falha de rede no GET S3: ${err.message?.slice(0, 200)}`,
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }

  const status = resp.status;
  t.marcar('s3_response', { status });

  if (status === 403) {
    // S3 presigned URL expirou ou ja foi usada
    const fim = t.finalizar();
    return {
      ok: false, categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
      mensagem: 'S3 presigned URL retornou 403 (expirada ou ja consumida).',
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }
  if (status >= 500 || status === 429) {
    const fim = t.finalizar();
    return {
      ok: false, categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
      mensagem: `S3 retornou HTTP ${status} (transient).`,
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }
  if (status !== 200) {
    const fim = t.finalizar();
    return {
      ok: false, categoria: CATEGORIAS_LOG.TIMEOUT_DOWNLOAD,
      mensagem: `S3 HTTP ${status} inesperado.`,
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }

  let buffer;
  try {
    buffer = Buffer.from(await resp.arrayBuffer());
  } catch (err) {
    const fim = t.finalizar();
    return {
      ok: false,
      categoria: categorizarErro(err.message),
      mensagem: `Falha lendo body S3: ${err.message?.slice(0, 150)}`,
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }

  if (!validarPdfBuffer(buffer)) {
    const inicio = (buffer || Buffer.alloc(0)).slice(0, 60).toString('utf8').replace(/[^\x20-\x7e]/g, '·');
    const fim = t.finalizar();
    return {
      ok: false, categoria: 'NAO_E_PDF',
      mensagem: `S3 200 mas nao e PDF. Primeiros bytes: ${inicio.slice(0, 80)}`,
      etapas: fim.etapas, duracaoMs: fim.duracaoMs,
    };
  }
  t.marcar('buffer_lido', { bytes: buffer.length });

  const fim = t.finalizar();
  return {
    ok: true, categoria: CATEGORIAS_LOG.SUCESSO,
    mensagem: null,
    etapas: fim.etapas, duracaoMs: fim.duracaoMs,
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
  doc, tokens, wsClient,
  tenantId, equipamento, ordem, trackingNumber,
}) {
  let ultimo = null;
  for (let tentativa = 1; tentativa <= RETRY_INLINE_MAX; tentativa++) {
    if (tentativa > 1) {
      const espera = RETRY_BACKOFF_MS[tentativa - 1] || 5_000;
      console.log(`[GEHC_DOWNLOAD] ${doc.documentId} tentativa ${tentativa}/${RETRY_INLINE_MAX} apos ${espera / 1000}s...`);
      await sleep_ms(espera);
    }

    const r = await baixarDocumentoViaUrl({ doc, tokens, wsClient });
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
// Refatorado em 2026-05-16 (ADR-019 v2): fluxo HTTP + WebSocket.
// Para cada OS pendente:
//   1. listarDocumentosDaOS (HTTP GraphQL)
//   2. baixarDocumentoViaUrl (mutation downloadDocument + espera WS preSignedUrl + GET S3)
// Sem DOM, sem popup, sem click. wsClient e' compartilhado por tenant (uma conexao
// WS por backfill — multiplexada via FIFO queue interna).

async function capturarPdfsDeEquipamento({ tenantId, equipamento, ordens, tokens, wsClient, contadorFalhasConsecutivas }) {
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
      const MAX_DOCS_POR_OS = 5;
      const docsParaBaixar = docsPendentes.slice(0, MAX_DOCS_POR_OS);
      if (docsPendentes.length > MAX_DOCS_POR_OS) {
        console.log(
          `[GEHC_PDF] SR${trackingNumber}: ${docsPendentes.length} documentos disponiveis, baixando apenas os primeiros ${MAX_DOCS_POR_OS}.`
        );
      }

      // Loop pelos documentos pendentes — usa wrapper com retry inline + log estruturado.
      for (const doc of docsParaBaixar) {
        processadas++;

        const retryResult = await baixarComRetry({
          doc, tokens, wsClient,
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
        // consecutivos falharam, quebra a execucao.
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

        if (contadorFalhasConsecutivas) {
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

  // Abre WS client UMA vez por backfill — multiplexa via FIFO queue.
  // Sem ele, source 101 (Salesforce) nao consegue baixar (mutation
  // downloadDocument entrega preSignedUrl assincronamente via WS).
  let wsClient;
  try {
    wsClient = new GehcSubscriptionClient({
      accessToken: tokens.accessToken,
      idToken:     tokens.idToken,
    });
  } catch (err) {
    console.error(`[GEHC_PDF] Falha abrindo WS tenant ${tenantId}: ${err.message}`);
    return { processadas: 0, capturados: 0, motivo: 'ws_failed' };
  }

  let session;
  try {
    session = await abrirSessaoAutenticada(tenantId);
  } catch (err) {
    await wsClient.dispose().catch(() => {});
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
        tenantId,
        equipamento,
        ordens: ordensDoEquipamento,
        tokens,
        wsClient,
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
    await wsClient.dispose().catch(() => {});
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
