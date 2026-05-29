// Circuit breaker por provider LLM. Estados:
//
//   CLOSED   — operacao normal, chamadas passam.
//   OPEN     — provider falhando muito; chamadas rejeitam IMEDIATAMENTE
//              sem nem tentar (cliente cai pro fallback se houver).
//   HALF_OPEN — pos cooldown; deixa UMA chamada de teste passar. Se ela
//              succeed, fecha o circuito. Se falhar, abre de novo.
//
// Por que isso importa:
//   1. Outage da OpenAI dispara cascata: cada chamada espera 30s timeout,
//      BullMQ retry, repete. Bill em retries + congelamento de filas.
//      Com breaker aberto, falha em 1ms (sem chamar API), cliente cai
//      pro Gemini quase imediatamente.
//   2. Quando OpenAI volta, half-open evita stampede — uma chamada
//      sonda, valida, depois libera o resto.
//
// Janela rolling de erros: ultimos N segundos. Se taxa de erro > threshold
// e volume minimo atingido, abre.
//
// Config via env (defaults conservadores):
//   LLM_BREAKER_ERROR_THRESHOLD   (default 0.5 = 50%)
//   LLM_BREAKER_MIN_VOLUME        (default 5 — minimo de chamadas pra
//                                  calcular taxa; abaixo disso fica CLOSED)
//   LLM_BREAKER_WINDOW_MS         (default 60000 — 60s rolling)
//   LLM_BREAKER_COOLDOWN_MS       (default 30000 — 30s OPEN antes de
//                                  tentar HALF_OPEN)

const CONFIG = {
  errorThreshold: parseFloat(process.env.LLM_BREAKER_ERROR_THRESHOLD || '0.5'),
  minVolume: parseInt(process.env.LLM_BREAKER_MIN_VOLUME || '5', 10),
  windowMs: parseInt(process.env.LLM_BREAKER_WINDOW_MS || '60000', 10),
  cooldownMs: parseInt(process.env.LLM_BREAKER_COOLDOWN_MS || '30000', 10),
};

const ESTADO_CLOSED = 'closed';
const ESTADO_OPEN = 'open';
const ESTADO_HALF_OPEN = 'half_open';

function novoBreaker() {
  return {
    estado: ESTADO_CLOSED,
    eventos: [],          // { ts, ok: boolean } janela rolling
    abertoEm: null,       // timestamp quando virou OPEN
    halfOpenInFlight: false, // ja tem chamada de teste em voo no HALF_OPEN?
  };
}

const breakers = {};

function obterBreaker(providerName) {
  if (!breakers[providerName]) {
    breakers[providerName] = novoBreaker();
  }
  return breakers[providerName];
}

function limparJanela(breaker) {
  const corte = Date.now() - CONFIG.windowMs;
  breaker.eventos = breaker.eventos.filter((e) => e.ts >= corte);
}

function avaliarAbertura(breaker) {
  limparJanela(breaker);
  if (breaker.eventos.length < CONFIG.minVolume) return;

  const erros = breaker.eventos.filter((e) => !e.ok).length;
  const taxa = erros / breaker.eventos.length;

  if (taxa >= CONFIG.errorThreshold) {
    breaker.estado = ESTADO_OPEN;
    breaker.abertoEm = Date.now();
    console.warn(
      `[CIRCUIT_BREAKER] ABRIU — taxa=${(taxa * 100).toFixed(1)}% em ${breaker.eventos.length} chamadas`
    );
  }
}

// Decide se a chamada pode prosseguir. Retorna:
//   { allow: true, half: false } — operacao normal (CLOSED)
//   { allow: true, half: true }  — chamada de teste em HALF_OPEN
//   { allow: false, reason: '...' } — circuito OPEN, falha imediata
export function decidirPermissao(providerName) {
  const breaker = obterBreaker(providerName);

  if (breaker.estado === ESTADO_CLOSED) {
    return { allow: true, half: false };
  }

  if (breaker.estado === ESTADO_OPEN) {
    const desde = Date.now() - breaker.abertoEm;
    if (desde < CONFIG.cooldownMs) {
      return {
        allow: false,
        reason: `circuit_open_cooldown_${Math.round((CONFIG.cooldownMs - desde) / 1000)}s`,
      };
    }
    // Cooldown estourou — vira HALF_OPEN
    breaker.estado = ESTADO_HALF_OPEN;
    breaker.halfOpenInFlight = false;
  }

  if (breaker.estado === ESTADO_HALF_OPEN) {
    if (breaker.halfOpenInFlight) {
      return { allow: false, reason: 'circuit_half_open_probe_em_voo' };
    }
    breaker.halfOpenInFlight = true;
    return { allow: true, half: true };
  }

  return { allow: true, half: false };
}

// Caller obrigatoriamente reporta resultado depois da chamada.
export function reportarResultado(providerName, ok, foiHalfOpen) {
  const breaker = obterBreaker(providerName);

  if (foiHalfOpen) {
    breaker.halfOpenInFlight = false;
    if (ok) {
      // Sonda OK — fecha circuito, zera historico
      breaker.estado = ESTADO_CLOSED;
      breaker.eventos = [];
      breaker.abertoEm = null;
      console.warn(`[CIRCUIT_BREAKER] FECHOU apos sonda HALF_OPEN OK`);
    } else {
      // Sonda falhou — reabre por mais um cooldown
      breaker.estado = ESTADO_OPEN;
      breaker.abertoEm = Date.now();
      console.warn(`[CIRCUIT_BREAKER] sonda HALF_OPEN falhou — reabre`);
    }
    return;
  }

  breaker.eventos.push({ ts: Date.now(), ok });
  avaliarAbertura(breaker);
}

export function getCircuitBreakerSnapshot() {
  const snapshot = {};
  for (const [provider, breaker] of Object.entries(breakers)) {
    limparJanela(breaker);
    const erros = breaker.eventos.filter((e) => !e.ok).length;
    snapshot[provider] = {
      estado: breaker.estado,
      eventos: breaker.eventos.length,
      erros,
      taxaErro:
        breaker.eventos.length > 0 ? erros / breaker.eventos.length : 0,
      abertoEm: breaker.abertoEm ? new Date(breaker.abertoEm).toISOString() : null,
    };
  }
  return snapshot;
}

// Util para testes
export function _resetCircuitBreakerState() {
  for (const provider of Object.keys(breakers)) {
    breakers[provider] = novoBreaker();
  }
}

export class CircuitOpenError extends Error {
  constructor(reason) {
    super(`CIRCUIT_OPEN:${reason}`);
    this.name = 'CircuitOpenError';
    this.reason = reason;
  }
}
