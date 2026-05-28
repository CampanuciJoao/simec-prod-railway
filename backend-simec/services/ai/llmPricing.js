// Tabela de precos USD por 1 milhao de tokens, por modelo. Usada pelo
// llmCallLog pra calcular o custo de cada chamada e atribuir por tenant
// e feature.
//
// MANUTENCAO: quando OpenAI/Google ajustarem precos, atualizar aqui.
// Valores baseados na tabela publica em maio/2026. Modelos nao listados
// caem no fallback PRICING_DEFAULT (estimativa conservadora).
//
// Referencias:
//  - OpenAI pricing: https://openai.com/api/pricing/
//  - Gemini pricing: https://ai.google.dev/pricing
//
// Custo eh calculado como:
//   (tokensIn * priceInPer1M / 1_000_000) + (tokensOut * priceOutPer1M / 1_000_000)
// Para modelos de embedding, tokensOut = 0 e cost vem soh de tokensIn.

const PRICING_TABLE = {
  // OpenAI chat completions
  'gpt-4.1-mini': { inPer1M: 0.40, outPer1M: 1.60 },
  'gpt-4.1': { inPer1M: 2.00, outPer1M: 8.00 },
  'gpt-4o-mini': { inPer1M: 0.15, outPer1M: 0.60 },
  'gpt-4o': { inPer1M: 2.50, outPer1M: 10.00 },

  // OpenAI embeddings
  'text-embedding-3-small': { inPer1M: 0.02, outPer1M: 0 },
  'text-embedding-3-large': { inPer1M: 0.13, outPer1M: 0 },

  // Google Gemini
  'gemini-2.5-flash': { inPer1M: 0.30, outPer1M: 2.50 },
  'gemini-2.5-pro': { inPer1M: 1.25, outPer1M: 10.00 },
  'gemini-1.5-flash': { inPer1M: 0.075, outPer1M: 0.30 },
  'gemini-1.5-pro': { inPer1M: 1.25, outPer1M: 5.00 },
};

// Fallback conservador (alto) — se modelo novo aparecer sem entrada,
// custo eh inflado pra chamar atencao e nao escondido. Logo aparece no
// painel como "valor estimado" e o operador atualiza a tabela.
const PRICING_DEFAULT = { inPer1M: 1.00, outPer1M: 4.00 };

export function calcularCustoUsd({ model, tokensIn = 0, tokensOut = 0 }) {
  const pricing = PRICING_TABLE[model] || PRICING_DEFAULT;
  const custoIn = (tokensIn * pricing.inPer1M) / 1_000_000;
  const custoOut = (tokensOut * pricing.outPer1M) / 1_000_000;
  return custoIn + custoOut;
}

export function modeloTemPreco(model) {
  return Object.prototype.hasOwnProperty.call(PRICING_TABLE, model);
}

// Para o painel admin mostrar uma legenda das tabelas
export function listarPrecosConhecidos() {
  return Object.entries(PRICING_TABLE).map(([model, { inPer1M, outPer1M }]) => ({
    model,
    inPer1M,
    outPer1M,
  }));
}
