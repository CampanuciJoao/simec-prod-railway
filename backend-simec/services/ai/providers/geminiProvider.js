import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '../config.js';

let cachedModel = null;

function getModelInstance() {
  if (cachedModel || !AI_CONFIG.gemini.apiKey) {
    return cachedModel;
  }

  const client = new GoogleGenerativeAI(AI_CONFIG.gemini.apiKey);
  cachedModel = client.getGenerativeModel({ model: AI_CONFIG.gemini.model });

  return cachedModel;
}

export const GeminiProvider = {
  name: 'gemini',

  isAvailable() {
    return !!AI_CONFIG.gemini.apiKey;
  },

  getModel() {
    return AI_CONFIG.gemini.model;
  },

  async generateText(prompt) {
    const model = getModelInstance();

    if (!model) {
      throw new Error('GEMINI_PROVIDER_UNAVAILABLE');
    }

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();

    if (!text) {
      throw new Error('GEMINI_EMPTY_RESPONSE');
    }

    return text;
  },
};
