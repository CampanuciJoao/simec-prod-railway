// Gera embeddings para eventos do Knowledge Layer que ainda nao tem.
// Roda em batch noturno, respeita pausa do pipeline IA_EMBEDDINGS.
//
// Texto de entrada para o embedding:
//   "<resumo> | causa: <causaCategoria> | severidade: <severidade>"
// Esse formato faz a busca semantica entrar em ressonancia com causa-raiz +
// severidade, nao so palavras do resumo.

import prisma from '../prismaService.js';
import { gerarEmbedding, EMBEDDING_MODEL_NAME } from './embeddingsService.js';
import { criarEmbeddingDual } from './pgvectorSearch.js';
import { estaAtivo, PIPELINE_NAMES } from './aiPipelineState.js';

const RATE_LIMIT_MS = 200; // OpenAI aguenta facil 5 req/s no tier basico

function montarTextoParaEmbedding(evento) {
  const partes = [evento.resumo];
  if (evento.causaCategoria) partes.push(`causa: ${evento.causaCategoria}`);
  if (evento.severidade) partes.push(`severidade: ${evento.severidade}`);
  return partes.join(' | ');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function gerarEmbeddingsTenant({ tenantId, limite = 200 } = {}) {
  if (!tenantId) throw new Error('tenantId obrigatorio');

  const ativo = await estaAtivo(PIPELINE_NAMES.IA_EMBEDDINGS, tenantId);
  if (!ativo) return { motivo: 'pipeline_pausado', processados: 0 };

  const eventos = await prisma.eventoEquipamento.findMany({
    where: {
      tenantId,
      embedding: null,
    },
    take: limite,
    orderBy: { ocorridoEm: 'desc' },
  });

  if (!eventos.length) return { processados: 0 };

  console.log(`[IA_EMBEDDINGS] Tenant=${tenantId} — gerando ${eventos.length} embedding(s).`);

  let sucessos = 0;
  let falhas = 0;

  for (const ev of eventos) {
    if (!(await estaAtivo(PIPELINE_NAMES.IA_EMBEDDINGS, tenantId))) break;

    const texto = montarTextoParaEmbedding(ev);
    const r = await gerarEmbedding(texto);

    if (!r.ok) {
      falhas++;
      console.warn(`[IA_EMBEDDINGS] Falha evento ${ev.id}: ${r.motivo}`);
      // Sem persistir falha — proxima execucao tenta de novo. Se for falta de
      // API key, todos vao falhar e o worker bate retry indefinidamente sem
      // custo (so log).
      continue;
    }

    try {
      // Persiste nas DUAS colunas (JSON antiga + vector nova) via raw
      // INSERT com ON CONFLICT DO NOTHING — idempotente, sem race.
      await criarEmbeddingDual({
        tenantId,
        eventoEquipamentoId: ev.id,
        embedding: r.embedding,
        model:     r.model,
        dim:       r.dim,
        inputText: r.inputText,
      });
      sucessos++;
    } catch (err) {
      console.error(`[IA_EMBEDDINGS] Erro persistir ${ev.id}: ${err.message}`);
      falhas++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  return { processados: eventos.length, sucessos, falhas, model: EMBEDDING_MODEL_NAME };
}

export async function gerarEmbeddingsTodosTenants(opts = {}) {
  const ativoGlobal = await estaAtivo(PIPELINE_NAMES.IA_EMBEDDINGS);
  if (!ativoGlobal) return { motivo: 'pipeline_globalmente_pausado' };

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
  });

  let totalSucessos = 0;
  let totalFalhas = 0;

  for (const t of tenants) {
    try {
      const r = await gerarEmbeddingsTenant({ tenantId: t.id, ...opts });
      totalSucessos += r.sucessos || 0;
      totalFalhas   += r.falhas   || 0;
    } catch (err) {
      console.error(`[IA_EMBEDDINGS] Tenant ${t.nome} falhou:`, err.message);
    }
  }

  return { tenants: tenants.length, sucessos: totalSucessos, falhas: totalFalhas };
}
