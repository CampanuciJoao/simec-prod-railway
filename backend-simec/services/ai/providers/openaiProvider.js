import axios from 'axios';
import { AI_CONFIG } from '../config.js';

// Provider retorna { text, usage: { promptTokens, completionTokens } }.
// O wrapper central (llmService.generateTextWithLlm) eh quem mede tempo,
// determina status (ok/fallback) e grava no LlmCallLog — providers nao
// duplicam logica de log nem de pricing.
export const OpenAIProvider = {
  name: 'openai',

  isAvailable() {
    return !!AI_CONFIG.openai.apiKey;
  },

  getModel() {
    return AI_CONFIG.openai.model;
  },

  async generateText(prompt) {
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

    const usage = response?.data?.usage || {};
    return {
      text,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
      },
    };
  },
};
