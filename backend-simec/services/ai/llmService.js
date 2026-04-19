import { getLlmConfigSummary, resolveAiProvider } from './config.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { NoopProvider } from './providers/noopProvider.js';
import { OpenAIProvider } from './providers/openaiProvider.js';

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

export async function generateTextWithLlm(prompt) {
  const provider = getActiveLlmProvider();

  try {
    return await provider.generateText(prompt);
  } catch (error) {
    const fallbackProvider = getFallbackLlmProvider();

    if (!fallbackProvider) {
      throw error;
    }

    console.warn(
      `[LLM_FALLBACK] provider=${provider.name} falhou; tentando fallback=${fallbackProvider.name}`
    );

    return fallbackProvider.generateText(prompt);
  }
}
