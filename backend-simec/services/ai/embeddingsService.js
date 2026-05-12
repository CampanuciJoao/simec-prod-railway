// Servico de geracao de embeddings — fala direto com OpenAI Embeddings API.
// Modelo padrao: text-embedding-3-small (1536 dim, $0.02 / 1M tokens).
// 10k eventos com resumo medio = ~$0.005. Irrelevante no custo total.
//
// Embeddings sao usados para:
//   - RAG: busca semantica de eventos similares ao texto do usuario
//   - Cluster de causa-raiz: agrupar eventos parecidos mesmo quando o
//     texto livre varia
//
// Se nao houver OPENAI_API_KEY configurada, retorna null silenciosamente —
// caller deve checar e pular. Sem fallback para Gemini aqui porque a API
// de embeddings do Google tem dimensao diferente, e misturar dimensoes
// no mesmo armazenamento quebra similaridade.

import { AI_CONFIG } from './config.js';

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

export async function gerarEmbedding(texto) {
  if (!AI_CONFIG.openai.apiKey) {
    return { ok: false, motivo: 'openai_api_key_ausente' };
  }
  if (!texto || typeof texto !== 'string') {
    return { ok: false, motivo: 'texto_vazio' };
  }

  const inputText = texto.slice(0, 8000); // limite seguro de tokens

  let res;
  try {
    res = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: inputText,
      }),
    });
  } catch (err) {
    return { ok: false, motivo: `fetch_failed: ${err.message}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, motivo: `http_${res.status}: ${body.slice(0, 200)}` };
  }

  const json = await res.json().catch(() => ({}));
  const vector = json?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIM) {
    return { ok: false, motivo: `vector_invalido (len=${vector?.length})` };
  }

  return {
    ok: true,
    embedding: vector,
    model: EMBEDDING_MODEL,
    dim: EMBEDDING_DIM,
    inputText,
    usageTokens: json?.usage?.total_tokens,
  };
}

// ─── Helpers de similaridade (cosine, na aplicacao) ─────────────────────────

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Encontra os top-K embeddings mais similares ao vetor query.
 * `candidatos`: array de { id, vetor, ...resto } — calcula em memoria.
 * Funciona ate ~10k candidatos sem problema; passar disso, migra pra pgvector.
 */
export function topKSimilares(queryVector, candidatos, k = 5) {
  return candidatos
    .map((c) => ({ ...c, similarity: cosineSimilarity(queryVector, c.vetor) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

export const EMBEDDING_MODEL_NAME = EMBEDDING_MODEL;
export const EMBEDDING_DIMENSION = EMBEDDING_DIM;
