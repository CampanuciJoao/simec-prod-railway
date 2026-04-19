function readEnv(name, fallback = null) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

export function resolveAiProvider() {
  const explicitProvider = readEnv('AI_PROVIDER');

  if (explicitProvider) {
    return explicitProvider.toLowerCase();
  }

  if (readEnv('OPENAI_API_KEY')) {
    return 'openai';
  }

  if (readEnv('GEMINI_API_KEY')) {
    return 'gemini';
  }

  return 'heuristic';
}

export const AI_CONFIG = {
  provider: resolveAiProvider(),
  openai: {
    apiKey: readEnv('OPENAI_API_KEY'),
    model: readEnv('OPENAI_MODEL', 'gpt-4.1-mini'),
    baseUrl: readEnv('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
  },
  gemini: {
    apiKey: readEnv('GEMINI_API_KEY'),
    model: readEnv('GEMINI_MODEL', 'gemini-2.5-flash'),
  },
};

export function getLlmConfigSummary() {
  return {
    provider: AI_CONFIG.provider,
    openaiConfigured: !!AI_CONFIG.openai.apiKey,
    openaiModel: AI_CONFIG.openai.model,
    geminiConfigured: !!AI_CONFIG.gemini.apiKey,
    geminiModel: AI_CONFIG.gemini.model,
  };
}
