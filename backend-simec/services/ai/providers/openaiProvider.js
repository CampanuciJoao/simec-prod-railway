import axios from 'axios';
import { AI_CONFIG } from '../config.js';
import { logLlmUsage } from '../llmUsageLogger.js';

export const OpenAIProvider = {
  name: 'openai',

  isAvailable() {
    return !!AI_CONFIG.openai.apiKey;
  },

  getModel() {
    return AI_CONFIG.openai.model;
  },

  async generateText(prompt, { tenantId, feature } = {}) {
    if (!AI_CONFIG.openai.apiKey) {
      throw new Error('OPENAI_PROVIDER_UNAVAILABLE');
    }

    const response = await axios.post(
      `${AI_CONFIG.openai.baseUrl}/chat/completions`,
      {
        model: AI_CONFIG.openai.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${AI_CONFIG.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const text = response?.data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error('OPENAI_EMPTY_RESPONSE');
    }

    const usage = response?.data?.usage;
    if (usage) {
      logLlmUsage({
        tenantId,
        feature,
        provider: 'openai',
        model: AI_CONFIG.openai.model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      });
    }

    return text;
  },
};
