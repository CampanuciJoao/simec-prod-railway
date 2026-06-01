// Busca por similaridade via pgvector — substitui o topKSimilares
// in-memory que carregava todos os candidatos pra Node e calculava
// cosine 1 a 1.
//
// Operador <=> retorna COSINE DISTANCE (1 - cosine similarity). ORDER BY
// vec_a <=> vec_b ASC = mais similar primeiro. Convertemos pra similarity
// (1 - dist) na borda pra preservar o contrato historico.
//
// Indice IVFFlat criado na migration 20260529000001 cuida do trabalho
// pesado — busca aproximada, mas com recall >95% nas configs default.
//
// Compat backward: durante backfill, alguns embedding_vec sao NULL.
// Linhas NULL sao excluidas via WHERE — caller que precise de cobertura
// total ainda usa topKSimilares antigo (fallback automatico).

import prisma from '../prismaService.js';

const EMBEDDING_DIM = 1536;

// Converte array JS [0.1, -0.2, ...] em literal pgvector "[0.1,-0.2,...]"
// pra interpolar via Prisma.sql. pgvector aceita esse formato em casts.
function vetorParaLiteralPgvector(vetor) {
  if (!Array.isArray(vetor) || vetor.length !== EMBEDDING_DIM) {
    throw new Error(`vetor_invalido: esperado array com ${EMBEDDING_DIM} dimensoes`);
  }
  return `[${vetor.join(',')}]`;
}

// Busca top-K eventos similares ao queryVector usando pgvector.
//   - tenantId: scoping obrigatorio (multi-tenant)
//   - equipamentoId: filtro opcional (estreita pra um equipamento so)
//   - k: quantos retornar (default 8)
//   - includeEvento: se true, faz JOIN com evento_equipamento pra trazer
//     metadados (resumo, severidade, etc) — usado pelo RAG
//
// Retorna array de { eventoEquipamentoEmbeddingId, eventoId, similarity,
// evento? }. Vazio se nenhum candidato com embedding_vec NOT NULL.
export async function topKSimilaresPgvector({
  tenantId,
  queryVector,
  equipamentoId = null,
  k = 8,
  includeEvento = true,
}) {
  if (!tenantId) throw new Error('tenantId_obrigatorio');
  const literal = vetorParaLiteralPgvector(queryVector);

  // Query base — usa Prisma.$queryRaw com cast explicito pra vector.
  // ::vector eh seguro porque literal eh construido em codigo nosso,
  // sem input do usuario (queryVector vem do embedding gerado pela OpenAI).
  //
  // 1 - (embedding_vec <=> $1::vector) = cosine similarity (0 a 1).
  if (includeEvento && equipamentoId) {
    return prisma.$queryRaw`
      SELECT
        eee.id AS "eventoEquipamentoEmbeddingId",
        ee.id AS "eventoId",
        ee."equipamento_id" AS "equipamentoId",
        ee."ocorrido_em" AS "ocorridoEm",
        ee.fonte AS "fonte",
        ee."tipo_evento" AS "tipoEvento",
        ee.severidade AS "severidade",
        ee."causa_categoria" AS "causaCategoria",
        ee.resumo AS "resumo",
        ee."detalhes_json" AS "detalhesJson",
        1 - (eee."embedding_vec" <=> ${literal}::vector) AS similarity
      FROM "evento_equipamento_embedding" eee
      INNER JOIN "evento_equipamento" ee ON ee.id = eee."evento_equipamento_id"
      WHERE eee."tenantId" = ${tenantId}
        AND eee."embedding_vec" IS NOT NULL
        AND ee."equipamento_id" = ${equipamentoId}
      ORDER BY eee."embedding_vec" <=> ${literal}::vector
      LIMIT ${k}
    `;
  }
  if (includeEvento) {
    return prisma.$queryRaw`
      SELECT
        eee.id AS "eventoEquipamentoEmbeddingId",
        ee.id AS "eventoId",
        ee."equipamento_id" AS "equipamentoId",
        ee."ocorrido_em" AS "ocorridoEm",
        ee.fonte AS "fonte",
        ee."tipo_evento" AS "tipoEvento",
        ee.severidade AS "severidade",
        ee."causa_categoria" AS "causaCategoria",
        ee.resumo AS "resumo",
        ee."detalhes_json" AS "detalhesJson",
        1 - (eee."embedding_vec" <=> ${literal}::vector) AS similarity
      FROM "evento_equipamento_embedding" eee
      INNER JOIN "evento_equipamento" ee ON ee.id = eee."evento_equipamento_id"
      WHERE eee."tenantId" = ${tenantId}
        AND eee."embedding_vec" IS NOT NULL
      ORDER BY eee."embedding_vec" <=> ${literal}::vector
      LIMIT ${k}
    `;
  }
  // Sem JOIN com evento_equipamento — uso mais leve quando caller so quer
  // ids/similaridade
  return prisma.$queryRaw`
    SELECT
      eee.id AS "eventoEquipamentoEmbeddingId",
      eee."evento_equipamento_id" AS "eventoId",
      1 - (eee."embedding_vec" <=> ${literal}::vector) AS similarity
    FROM "evento_equipamento_embedding" eee
    WHERE eee."tenantId" = ${tenantId}
      AND eee."embedding_vec" IS NOT NULL
    ORDER BY eee."embedding_vec" <=> ${literal}::vector
    LIMIT ${k}
  `;
}

// Conta linhas com e sem embedding_vec — usado pelo painel SuperAdmin
// pra monitorar progresso do backfill.
export async function obterStatusBackfill() {
  const rows = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      COUNT("embedding_vec")::int AS preenchidos,
      COUNT(*) FILTER (WHERE "embedding_vec" IS NULL)::int AS pendentes
    FROM "evento_equipamento_embedding"
  `;
  const r = rows[0] || { total: 0, preenchidos: 0, pendentes: 0 };
  return {
    total: r.total,
    preenchidos: r.preenchidos,
    pendentes: r.pendentes,
    progressoPct: r.total > 0 ? Math.round((r.preenchidos / r.total) * 100) : 100,
  };
}

// Persiste o embedding nas DUAS colunas (JSON antiga + vector nova)
// durante a fase de transicao. Caller do worker chama isso em vez de
// prisma.eventoEquipamentoEmbedding.create direto.
export async function criarEmbeddingDual({
  tenantId,
  eventoEquipamentoId,
  embedding,
  model,
  dim,
  inputText,
}) {
  const literal = vetorParaLiteralPgvector(embedding);
  // INSERT via raw porque vector nao esta no schema Prisma.
  // ON CONFLICT (evento_equipamento_id) — coluna unique — evita race
  // condition quando outro worker ja criou.
  await prisma.$executeRaw`
    INSERT INTO "evento_equipamento_embedding" (
      id, "tenantId", "evento_equipamento_id", embedding, "embedding_vec",
      model, dim, "input_text", "gerado_em", "createdAt"
    ) VALUES (
      gen_random_uuid(), ${tenantId}, ${eventoEquipamentoId},
      ${JSON.stringify(embedding)}::jsonb, ${literal}::vector,
      ${model}, ${dim}, ${inputText}, NOW(), NOW()
    )
    ON CONFLICT ("evento_equipamento_id") DO NOTHING
  `;
}

// Backfill: pega N embeddings que ainda nao tem embedding_vec,
// copia da coluna JSON pra coluna vector. Roda em batch idempotente.
export async function backfillBatchPgvector({ limite = 500 } = {}) {
  // Pega o batch
  const pendentes = await prisma.$queryRaw`
    SELECT id, embedding
    FROM "evento_equipamento_embedding"
    WHERE "embedding_vec" IS NULL
    LIMIT ${limite}
  `;

  if (!pendentes.length) return { processados: 0, falhas: 0 };

  let processados = 0;
  let falhas = 0;
  for (const linha of pendentes) {
    try {
      const arr = Array.isArray(linha.embedding)
        ? linha.embedding
        : linha.embedding;
      if (!Array.isArray(arr) || arr.length !== EMBEDDING_DIM) {
        // JSON corrompido ou dim diferente — pula. Worker recria depois.
        falhas++;
        continue;
      }
      const literal = vetorParaLiteralPgvector(arr);
      await prisma.$executeRaw`
        UPDATE "evento_equipamento_embedding"
        SET "embedding_vec" = ${literal}::vector
        WHERE id = ${linha.id}
      `;
      processados++;
    } catch (err) {
      console.warn(`[PGVECTOR_BACKFILL] Falha id=${linha.id}: ${err.message}`);
      falhas++;
    }
  }

  return { processados, falhas };
}
