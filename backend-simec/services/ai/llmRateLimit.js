// Rate limiter token-bucket simples por provider LLM. Protege contra:
//  - bills concentrados em pico (cron de backfill GEHC despejando 200
//    PDFs no OpenAI ao mesmo tempo)
//  - rate-limit 429 do provider (que dispara retry cego do BullMQ e cria
//    cascata de falhas)
//
// Cada provider tem 2 controles:
//   1. **Concurrency**: quantas chamadas em VOO ao mesmo tempo
//   2. **Reservoir + window**: quantas chamadas no minuto (token bucket)
//
// Quando algum limite eh atingido, a chamada FICA NA FILA (await) ate
// liberar. NAO falha — fila eh transparente pro caller. Latencia gasta
// na espera eh capturada pelo wrapper central (durationMs no LlmCallLog).
//
// Configuracao via env (defaults conservadores):
//   LLM_OPENAI_MAX_CONCURRENT   (default 5)
//   LLM_OPENAI_RPM              (default 60 — 1 req/s sustentado)
//   LLM_GEMINI_MAX_CONCURRENT   (default 3)
//   LLM_GEMINI_RPM              (default 30)
//
// Single-process: contadores in-memory. Multi-worker BullMQ teria que
// usar Redis pra coordenacao global — nao eh o caso atual (1 worker
// + 1 server, cada um com sua quota).

const CONFIGS = {
  openai: {
    maxConcurrent: parseInt(process.env.LLM_OPENAI_MAX_CONCURRENT || '5', 10),
    rpm: parseInt(process.env.LLM_OPENAI_RPM || '60', 10),
  },
  gemini: {
    maxConcurrent: parseInt(process.env.LLM_GEMINI_MAX_CONCURRENT || '3', 10),
    rpm: parseInt(process.env.LLM_GEMINI_RPM || '30', 10),
  },
};

const WINDOW_MS = 60 * 1000;

function novoEstado() {
  return {
    inFlight: 0,            // chamadas em VOO agora
    janelaTimestamps: [],   // timestamps (ms) das ultimas chamadas iniciadas — usado pra contar req/min
    filaEspera: [],         // resolvers aguardando capacidade
  };
}

const estados = {
  openai: novoEstado(),
  gemini: novoEstado(),
};

function obterEstado(providerName) {
  if (!estados[providerName]) {
    // Provider novo? Cria estado default lazy. Sem config = sem limite
    // (fail-open — nao bloquear chamada por falta de config).
    estados[providerName] = novoEstado();
  }
  return estados[providerName];
}

function obterConfig(providerName) {
  return CONFIGS[providerName] || { maxConcurrent: 99, rpm: 99999 };
}

function podeProsseguir(providerName) {
  const estado = obterEstado(providerName);
  const config = obterConfig(providerName);
  const agora = Date.now();

  // Limpa timestamps fora da janela rolling de 60s
  estado.janelaTimestamps = estado.janelaTimestamps.filter(
    (ts) => agora - ts < WINDOW_MS
  );

  if (estado.inFlight >= config.maxConcurrent) return false;
  if (estado.janelaTimestamps.length >= config.rpm) return false;

  return true;
}

function reservar(providerName) {
  const estado = obterEstado(providerName);
  estado.inFlight += 1;
  estado.janelaTimestamps.push(Date.now());
}

function liberar(providerName) {
  const estado = obterEstado(providerName);
  estado.inFlight = Math.max(0, estado.inFlight - 1);

  // Acorda proxima na fila se houver capacidade
  if (estado.filaEspera.length && podeProsseguir(providerName)) {
    const proximo = estado.filaEspera.shift();
    proximo();
  }
}

// Aguarda capacidade. Garante FIFO via fila de resolvers.
// Retorna handle { release } — caller obrigatoriamente chama no final.
export async function aguardarLimiteEReservar(providerName) {
  const estado = obterEstado(providerName);

  if (podeProsseguir(providerName)) {
    reservar(providerName);
    return { release: () => liberar(providerName) };
  }

  // Bloqueia ate liberar — proximo da fila eh resolvido pelo `liberar`
  await new Promise((resolve) => {
    estado.filaEspera.push(resolve);
  });

  // Quando volta, reserva (capacidade ja foi conferida em liberar)
  reservar(providerName);
  return { release: () => liberar(providerName) };
}

// Util para observabilidade — exposto no painel SuperAdmin ou metricas
export function getRateLimitSnapshot() {
  const snapshot = {};
  for (const [provider, estado] of Object.entries(estados)) {
    const config = obterConfig(provider);
    const agora = Date.now();
    const janelaAtiva = estado.janelaTimestamps.filter(
      (ts) => agora - ts < WINDOW_MS
    );
    snapshot[provider] = {
      inFlight: estado.inFlight,
      maxConcurrent: config.maxConcurrent,
      windowCount: janelaAtiva.length,
      rpm: config.rpm,
      queueLength: estado.filaEspera.length,
    };
  }
  return snapshot;
}

// Util para testes — limpa estado global
export function _resetRateLimitState() {
  for (const provider of Object.keys(estados)) {
    estados[provider] = novoEstado();
  }
}
