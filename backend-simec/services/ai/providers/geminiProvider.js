import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '../config.js';

let cachedClient = null;

function getClient() {
  if (!AI_CONFIG.gemini.apiKey) return null;
  if (!cachedClient) cachedClient = new GoogleGenerativeAI(AI_CONFIG.gemini.apiKey);
  return cachedClient;
}

// Mesmo contrato do OpenAIProvider: retorna { text, usage }. O wrapper
// central eh responsavel por medir tempo + gravar no LlmCallLog.
export const GeminiProvider = {
  name: 'gemini',

  isAvailable() {
    return !!AI_CONFIG.gemini.apiKey;
  },

  getModel() {
    return AI_CONFIG.gemini.model;
  },

  async generateText(prompt) {
    const client = getClient();

    if (!client) {
      throw new Error('GEMINI_PROVIDER_UNAVAILABLE');
    }

    const model = client.getGenerativeModel({
      model: AI_CONFIG.gemini.model,
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();

    if (!text) {
      throw new Error('GEMINI_EMPTY_RESPONSE');
    }

    const usage = result?.response?.usageMetadata || {};
    return {
      text,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
      },
    };
  },
};
