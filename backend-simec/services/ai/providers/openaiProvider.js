import axios from 'axios';
import { AI_CONFIG } from '../config.js';

function collectTextFromNode(node, buffer = []) {
  if (!node) {
    return buffer;
  }

  if (typeof node === 'string') {
    buffer.push(node);
    return buffer;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectTextFromNode(item, buffer));
    return buffer;
  }

  if (typeof node === 'object') {
    if (typeof node.text === 'string') {
      buffer.push(node.text);
    }

    if (typeof node.output_text === 'string') {
      buffer.push(node.output_text);
    }

    if (node.content) {
      collectTextFromNode(node.content, buffer);
    }

    if (node.output) {
      collectTextFromNode(node.output, buffer);
    }
  }

  return buffer;
}

function extractOpenAIText(payload = {}) {
  const directText = payload.output_text;

  if (typeof directText === 'string' && directText.trim()) {
    return directText.trim();
  }

  const text = collectTextFromNode(payload).join('\n').trim();
  return text || null;
}

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
      `${AI_CONFIG.openai.baseUrl}/responses`,
      {
        model: AI_CONFIG.openai.model,
        input: prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${AI_CONFIG.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const text = extractOpenAIText(response?.data);

    if (!text) {
      throw new Error('OPENAI_EMPTY_RESPONSE');
    }

    return text;
  },
};
