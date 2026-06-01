// RAG (Retrieval-Augmented Generation) sobre o Knowledge Layer.
//
// Fluxo:
//   1. Recebe pergunta livre + tenantId + equipamentoId opcional
//   2. Gera embedding da pergunta
//   3. Busca top-K eventos similares (cosine similarity em memoria)
//   4. Monta prompt enriquecido com contexto + eventos como evidencia
//   5. Chama LLM e retorna resposta + lista de eventos citados
//
// Usado por:
//   - Endpoint /api/gehc/aprendizado/ia/ask (admin/debug)
//   - (Futuro) integracao no RoteadorAgente como agente "EquipmentInsights"
//
// Sem custo de inferencia ate ser chamado. Cada chamada custa ~$0.001 (1 embedding
// + 1 completion gpt-4.1-mini).

import prisma from '../prismaService.js';
import { generateTextWithLlm, getLlmRuntimeInfo } from './llmService.js';
import { gerarEmbedding, topKSimilares } from './embeddingsService.js';
import { topKSimilaresPgvector } from './pgvectorSearch.js';

const TOP_K_DEFAULT = 8;
const MAX_EVENTOS_LIDOS = 2000; // hard limit para nao explodir memoria (fallback in-memory)

// Implementacao via pgvector — busca aproximada O(log n) com indice IVFFlat.
// Latencia ~25ms ate 100k vetores. Quando embedding_vec esta NULL (nao
// backfilled ainda), eh excluido — caller cai pro fallback in-memory.
async function buscarPgvector({ tenantId, queryVector, equipamentoId, k }) {
  const rows = await topKSimilaresPgvector({
    tenantId,
    queryVector,
    equipamentoId,
    k,
    includeEvento: true,
  });
  return rows.map((r) => ({
    eventoId: r.eventoId,
    similarity: Number((r.similarity ?? 0).toFixed(4)),
    ocorridoEm: r.ocorridoEm,
    fonte: r.fonte,
    tipoEvento: r.tipoEvento,
    severidade: r.severidade,
    causaCategoria: r.causaCategoria,
    resumo: r.resumo,
    equipamentoId: r.equipamentoId,
  }));
}

// Implementacao in-memory — fallback historico. Carrega ate 2000
// candidatos pra Node e calcula cosine 1 a 1. Lento mas correto.
// Usado quando pgvector retorna vazio (todos os embedding_vec NULL no
// tenant) ou quando $queryRaw da erro inesperado.
async function buscarInMemory({ tenantId, queryVector, equipamentoId, modeloEmbedding, k }) {
  const where = { tenantId };
  if (equipamentoId) where.evento = { equipamentoId };

  const candidatos = await prisma.eventoEquipamentoEmbedding.findMany({
    where,
    take: MAX_EVENTOS_LIDOS,
    orderBy: { geradoEm: 'desc' },
    include: {
      evento: {
        select: {
          id: true,
          equipamentoId: true,
          ocorridoEm: true,
          fonte: true,
          tipoEvento: true,
          severidade: true,
          causaCategoria: true,
          resumo: true,
          detalhesJson: true,
        },
      },
    },
  });

  if (!candidatos.length) return [];

  const ranking = topKSimilares(
    queryVector,
    candidatos.map((c) => ({ id: c.id, vetor: c.embedding, evento: c.evento })),
    k
  );
  return ranking.map((r) => ({
    eventoId: r.evento.id,
    similarity: Number(r.similarity?.toFixed(4)),
    ocorridoEm: r.evento.ocorridoEm,
    fonte: r.evento.fonte,
    tipoEvento: r.evento.tipoEvento,
    severidade: r.evento.severidade,
    causaCategoria: r.evento.causaCategoria,
    resumo: r.evento.resumo,
    equipamentoId: r.evento.equipamentoId,
  }));
}

export async function buscarEventosRelevantes({ tenantId, pergunta, equipamentoId = null, k = TOP_K_DEFAULT }) {
  // 1. Embedding da pergunta
  const emb = await gerarEmbedding(pergunta);
  if (!emb.ok) {
    return { ok: false, motivo: emb.motivo };
  }

  // 2. Tenta pgvector (rapido). Se vazio (embedding_vec ainda nao
  // backfilled pra esse tenant) ou erro, cai pro fallback in-memory.
  let eventos = [];
  let viaPgvector = false;
  try {
    eventos = await buscarPgvector({
      tenantId,
      queryVector: emb.embedding,
      equipamentoId,
      k,
    });
    viaPgvector = eventos.length > 0;
  } catch (err) {
    console.warn(`[RAG] pgvector falhou, caindo pro fallback in-memory: ${err.message}`);
  }

  if (!viaPgvector) {
    eventos = await buscarInMemory({
      tenantId,
      queryVector: emb.embedding,
      equipamentoId,
      modeloEmbedding: emb.model,
      k,
    });
  }

  return {
    ok: true,
    modeloEmbedding: emb.model,
    metodoBusca: viaPgvector ? 'pgvector' : 'in_memory',
    eventos,
  };
}

function montarContextoComEventos(eventos) {
  if (!eventos.length) return '(sem eventos relevantes encontrados na memoria da IA)';
  return eventos.map((e, i) =>
    `[${i + 1}] ${new Date(e.ocorridoEm).toISOString().slice(0, 10)} · ${e.fonte}/${e.tipoEvento}` +
    ` (sev=${e.severidade}${e.causaCategoria ? `, causa=${e.causaCategoria}` : ''})\n    ${e.resumo}`
  ).join('\n');
}

export async function perguntarIaSobreEquipamento({ tenantId, pergunta, equipamentoId = null, k = TOP_K_DEFAULT }) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) return { ok: false, motivo: 'llm_indisponivel' };

  const ctx = await buscarEventosRelevantes({ tenantId, pergunta, equipamentoId, k });
  if (!ctx.ok) return { ok: false, motivo: ctx.motivo };

  const contextoTexto = montarContextoComEventos(ctx.eventos);

  const prompt = `Voce e uma IA especialista em manutencao de equipamentos medicos hospitalares.
Responda a pergunta abaixo usando APENAS as evidencias fornecidas. Cite os eventos pelo numero entre colchetes ([1], [2]).
Se as evidencias nao forem suficientes para responder, diga isso explicitamente.

Pergunta:
${pergunta}

Evidencias da memoria da IA (eventos do equipamento):
${contextoTexto}

Resposta (em portugues, objetiva, 2-4 paragrafos, citando evidencias):`;

  let resposta;
  try {
    resposta = await generateTextWithLlm(prompt, {
      feature: 'rag_search',
      tenantId,
      ...(equipamentoId ? { refType: 'Equipamento', refId: equipamentoId } : {}),
    });
  } catch (err) {
    return { ok: false, motivo: `llm_failed: ${err.message}` };
  }

  return {
    ok: true,
    resposta,
    eventosCitados: ctx.eventos,
    modeloEmbedding: ctx.modeloEmbedding,
    modeloLlm: llm.activeModel,
  };
}
