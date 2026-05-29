import { getLlmConfigSummary, resolveAiProvider } from './config.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { NoopProvider } from './providers/noopProvider.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { observeLlmCall } from '../metrics/metricsService.js';
import { registrarLlmCall } from './llmCallLog.js';
import { aguardarLimiteEReservar } from './llmRateLimit.js';
import {
  decidirPermissao,
  reportarResultado,
  CircuitOpenError,
} from './llmCircuitBreaker.js';

const PROVIDERS = {
  openai: OpenAIProvider,
  gemini: GeminiProvider,
  heuristic: NoopProvider,
};

export function getActiveLlmProvider() {
  const providerName = resolveAiProvider();
  return PROVIDERS[providerName] || NoopProvider;
}

function getFallbackLlmProvider() {
  const providerName = resolveAiProvider();

  if (providerName === 'openai' && GeminiProvider.isAvailable()) {
    return GeminiProvider;
  }

  if (providerName === 'gemini' && OpenAIProvider.isAvailable()) {
    return OpenAIProvider;
  }

  return null;
}

export function getLlmRuntimeInfo() {
  const provider = getActiveLlmProvider();
  const summary = getLlmConfigSummary();

  return {
    ...summary,
    activeProvider: provider.name,
    activeModel: provider.getModel?.() || null,
    available: provider.isAvailable(),
  };
}

// Wrapper central para chamadas LLM. Faz 3 coisas que cada caller nao
// precisa repetir:
//   1. Mede duracao
//   2. Tenta provider primario; em erro, cai para fallback (OpenAI<>Gemini)
//   3. Grava no LlmCallLog (DB) + Prometheus (observeLlmCall) — com
//      tokensIn/tokensOut/custoUSD/status. Caller ja nao precisa logar.
//
// `options` aceita: { feature, tenantId, refType, refId } pra atribuir
// a chamada a uma feature/tenant/entidade.
//
// Retorna: string (o texto do LLM). Internamente lida com providers que
// retornam { text, usage } e desencapsula pra preservar API existente.
// Executa chamada ao provider com rate limit (token bucket por minuto +
// concorrencia) e circuit breaker (abre apos taxa de erro alta, evita
// cascata em outage). Caller (generateTextWithLlm) lida com fallback
// pro provider secundario quando CircuitOpenError eh lancado.
async function tentarProvider({ provider, prompt, t0 }) {
  // 1. Circuit breaker — falha rapida se provider esta em OPEN
  const permissao = decidirPermissao(provider.name);
  if (!permissao.allow) {
    throw new CircuitOpenError(permissao.reason);
  }

  // 2. Rate limiter — espera capacidade (FIFO). Tempo de espera entra
  //    em durationMs, capturado pelo wrapper central.
  const handle = await aguardarLimiteEReservar(provider.name);

  let ok = false;
  try {
    const result = await provider.generateText(prompt);

    // Compat: providers novos retornam { text, usage }. Se algum provider
    // antigo retornar string crua, encapsula com usage zerado.
    const text = typeof result === 'string' ? result : result.text;
    const usage =
      (typeof result === 'object' && result.usage) ||
      { promptTokens: 0, completionTokens: 0 };
    const durationMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

    ok = true;
    return { text, usage, durationMs };
  } finally {
    handle.release();
    reportarResultado(provider.name, ok, permissao.half);
  }
}

export async function generateTextWithLlm(prompt, options = {}) {
  const provider = getActiveLlmProvider();
  const model = provider.getModel?.() || 'unknown';
  const feature = options.feature || 'unknown';
  const tenantId = options.tenantId || null;
  const refType = options.refType || null;
  const refId = options.refId || null;
  const t0 = process.hrtime.bigint();

  try {
    const { text, usage, durationMs } = await tentarProvider({ provider, prompt, t0 });

    observeLlmCall({
      provider: provider.name,
      model,
      feature,
      status: 'ok',
      durationSeconds: durationMs / 1000,
    });
    registrarLlmCall({
      tenantId,
      feature,
      provider: provider.name,
      model,
      status: 'ok',
      tokensIn: usage.promptTokens,
      tokensOut: usage.completionTokens,
      durationMs,
      refType,
      refId,
    });
    return text;
  } catch (error) {
    const fallbackProvider = getFallbackLlmProvider();

    // Circuit breaker aberto: status especial 'circuit_open'. Distingue
    // de 'error' real (chamada nem rodou — falha rapida) e nao polui
    // metricas de erro de provider.
    const statusErroPrimario = error instanceof CircuitOpenError ? 'circuit_open' : 'error';

    if (!fallbackProvider) {
      const durationMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);
      observeLlmCall({
        provider: provider.name,
        model,
        feature,
        status: statusErroPrimario,
        durationSeconds: durationMs / 1000,
      });
      registrarLlmCall({
        tenantId,
        feature,
        provider: provider.name,
        model,
        status: statusErroPrimario,
        durationMs,
        refType,
        refId,
        errorMessage: error.message,
      });
      throw error;
    }

    if (statusErroPrimario === 'circuit_open') {
      console.warn(
        `[LLM_CIRCUIT_OPEN] provider=${provider.name} ${error.reason}; cai pra fallback=${fallbackProvider.name}`
      );
      // Registra a falha rapida em LlmCallLog mesmo assim, pra contar custo zero
      // mas mostrar no painel que aconteceu.
      registrarLlmCall({
        tenantId,
        feature,
        provider: provider.name,
        model,
        status: 'circuit_open',
        durationMs: 0,
        refType,
        refId,
        errorMessage: error.reason,
      });
    } else {
      console.warn(
        `[LLM_FALLBACK] provider=${provider.name} falhou; tentando fallback=${fallbackProvider.name}`
      );
    }

    const fallbackModel = fallbackProvider.getModel?.() || 'unknown';
    const t1 = process.hrtime.bigint();
    try {
      const { text, usage, durationMs } = await tentarProvider({
        provider: fallbackProvider,
        prompt,
        t0: t1,
      });

      observeLlmCall({
        provider: fallbackProvider.name,
        model: fallbackModel,
        feature,
        status: 'fallback',
        durationSeconds: durationMs / 1000,
      });
      registrarLlmCall({
        tenantId,
        feature,
        provider: fallbackProvider.name,
        model: fallbackModel,
        status: 'fallback',
        tokensIn: usage.promptTokens,
        tokensOut: usage.completionTokens,
        durationMs,
        refType,
        refId,
      });
      return text;
    } catch (fallbackError) {
      const durationMs = Math.round(Number(process.hrtime.bigint() - t1) / 1e6);
      observeLlmCall({
        provider: fallbackProvider.name,
        model: fallbackModel,
        feature,
        status: 'error',
        durationSeconds: durationMs / 1000,
      });
      registrarLlmCall({
        tenantId,
        feature,
        provider: fallbackProvider.name,
        model: fallbackModel,
        status: 'error',
        durationMs,
        refType,
        refId,
        errorMessage: fallbackError.message,
      });
      throw fallbackError;
    }
  }
}

/**
 * Gera JSON estruturado via LLM com parse seguro.
 * Os providers já retornam JSON válido via JSON mode — sem necessidade de regex.
 * options.tenantId/feature sao repassados ao provider para log de uso.
 */
export async function generateJsonWithLlm(prompt, options = {}) {
  const text = await generateTextWithLlm(prompt, options);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`LLM_INVALID_JSON: resposta não é JSON válido. Recebido: ${text?.slice(0, 200)}`);
  }
}
