import { getLlmConfigSummary, resolveAiProvider } from './config.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { NoopProvider } from './providers/noopProvider.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { observeLlmCall } from '../metrics/metricsService.js';

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

export async function generateTextWithLlm(prompt, options = {}) {
  const provider = getActiveLlmProvider();
  const feature = options.feature || 'unknown';
  const t0 = process.hrtime.bigint();

  try {
    const result = await provider.generateText(prompt, options);
    observeLlmCall({
      provider: provider.name,
      model: provider.getModel?.() || 'unknown',
      feature,
      status: 'ok',
      durationSeconds: Number(process.hrtime.bigint() - t0) / 1e9,
    });
    return result;
  } catch (error) {
    const fallbackProvider = getFallbackLlmProvider();

    if (!fallbackProvider) {
      observeLlmCall({
        provider: provider.name,
        model: provider.getModel?.() || 'unknown',
        feature,
        status: 'error',
        durationSeconds: Number(process.hrtime.bigint() - t0) / 1e9,
      });
      throw error;
    }

    console.warn(
      `[LLM_FALLBACK] provider=${provider.name} falhou; tentando fallback=${fallbackProvider.name}`
    );

    try {
      const result = await fallbackProvider.generateText(prompt, options);
      observeLlmCall({
        provider: fallbackProvider.name,
        model: fallbackProvider.getModel?.() || 'unknown',
        feature,
        status: 'fallback',
        durationSeconds: Number(process.hrtime.bigint() - t0) / 1e9,
      });
      return result;
    } catch (fallbackError) {
      observeLlmCall({
        provider: fallbackProvider.name,
        model: fallbackProvider.getModel?.() || 'unknown',
        feature,
        status: 'error',
        durationSeconds: Number(process.hrtime.bigint() - t0) / 1e9,
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
