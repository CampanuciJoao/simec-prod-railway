#!/usr/bin/env node
// Smoke test de paridade: compara TOP-K entre pgvector e in-memory.
// Gera embeddings de queries sinteticas e checa que os mesmos eventos
// aparecem (pode haver leve reordenacao por aproximacao do IVFFlat).
//
// Criterio de aceite: 80% dos top-5 batem entre os dois metodos.
// Acima disso eh esperado conforme IVFFlat (recall ~95%+ na config default).
//
// Uso:
//   DATABASE_URL=... node scripts/smoke-test-pgvector.mjs

import prisma from '../services/prismaService.js';
import { gerarEmbedding, topKSimilares } from '../services/ai/embeddingsService.js';
import { topKSimilaresPgvector } from '../services/ai/pgvectorSearch.js';

const QUERIES_TESTE = [
  'helio em nivel critico no equipamento de ressonancia',
  'falha no compressor do magneto',
  'preventiva concluida sem problemas',
  'troca de bobina por defeito',
  'inspeção de qualidade reprovada',
];

const K = 5;
const EMBEDDING_DIM = 1536;

// Quando nao ha OPENAI_API_KEY (rodando local sem env), usa um vetor de
// um embedding existente no banco como "query" — testa paridade do
// ALGORITMO de busca (deve dar overlap 100% porque o vetor query bate
// com 1 dos candidatos). Sem API key, smoke test foca em "pgvector
// devolve resultados similares ao in-memory pro mesmo query".
async function obterQueryVector(tenantId) {
  const emb = await gerarEmbedding('teste smoke pgvector');
  if (emb.ok) return { vetor: emb.embedding, fonte: 'openai' };

  // Fallback: usa um embedding existente como query
  const linhas = await prisma.eventoEquipamentoEmbedding.findMany({
    where: { tenantId },
    take: 1,
    select: { embedding: true },
  });
  if (linhas.length && Array.isArray(linhas[0].embedding) && linhas[0].embedding.length === EMBEDDING_DIM) {
    return { vetor: linhas[0].embedding, fonte: 'existente_no_banco' };
  }
  return null;
}

async function rodarTeste(tenantId, pergunta, queryVector) {
  const emb = queryVector
    ? { ok: true, embedding: queryVector }
    : await gerarEmbedding(pergunta);
  if (!emb.ok) {
    console.log(`[SKIP] embedding falhou: ${emb.motivo}`);
    return null;
  }

  // pgvector
  const t0 = Date.now();
  const viaPgvector = await topKSimilaresPgvector({
    tenantId,
    queryVector: emb.embedding,
    k: K,
    includeEvento: false,
  });
  const tPg = Date.now() - t0;

  // in-memory
  const t1 = Date.now();
  const candidatos = await prisma.eventoEquipamentoEmbedding.findMany({
    where: { tenantId },
    take: 2000,
    orderBy: { geradoEm: 'desc' },
  });
  const viaInMemory = topKSimilares(
    emb.embedding,
    candidatos.map((c) => ({ id: c.id, vetor: c.embedding })),
    K
  );
  const tMem = Date.now() - t1;

  const idsPg = new Set(viaPgvector.map((r) => r.eventoEquipamentoEmbeddingId));
  const idsMem = new Set(viaInMemory.map((r) => r.id));
  const intersecao = [...idsPg].filter((id) => idsMem.has(id));
  const overlap = idsPg.size > 0 ? intersecao.length / Math.max(idsPg.size, idsMem.size) : 0;

  return { pergunta, tPg, tMem, idsPg: idsPg.size, idsMem: idsMem.size, overlap };
}

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
  });
  if (!tenants.length) {
    console.log('[SMOKE] Nenhum tenant ativo.');
    await prisma.$disconnect();
    return;
  }

  // Pega o primeiro tenant com embeddings preenchidos
  let tenantUsado = null;
  for (const t of tenants) {
    const c = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS c
      FROM "evento_equipamento_embedding"
      WHERE "tenantId" = ${t.id} AND "embedding_vec" IS NOT NULL
    `;
    if (c[0]?.c > 0) {
      tenantUsado = t;
      break;
    }
  }

  if (!tenantUsado) {
    console.log('[SMOKE] Nenhum tenant com embedding_vec preenchido — pule backfill primeiro.');
    await prisma.$disconnect();
    return;
  }

  console.log(`[SMOKE] Tenant: ${tenantUsado.nome} (${tenantUsado.id})`);
  console.log(`[SMOKE] Top-K=${K} | ${QUERIES_TESTE.length} queries`);

  // Obter query vector (OpenAI ou fallback). Quando vem do banco, todas
  // as queries usam o mesmo vetor — paridade do algoritmo eh o que
  // importa.
  const qv = await obterQueryVector(tenantUsado.id);
  if (!qv) {
    console.log('[SMOKE] Nao foi possivel obter query vector (sem OpenAI key e sem dados).');
    await prisma.$disconnect();
    return;
  }
  console.log(`[SMOKE] Query vector: ${qv.fonte}`);
  console.log('');

  const resultados = [];
  for (const q of QUERIES_TESTE) {
    const vetorAtual = qv.fonte === 'openai' ? null : qv.vetor;
    const r = await rodarTeste(tenantUsado.id, q, vetorAtual);
    if (r) resultados.push(r);
  }

  console.log('\n[SMOKE] Resultados:');
  console.log('Query (50ch)                                       | pgvec | inmem | overlap');
  console.log('---------------------------------------------------|-------|-------|--------');
  let mediaOverlap = 0;
  let mediaPg = 0;
  let mediaMem = 0;
  for (const r of resultados) {
    console.log(
      `${r.pergunta.slice(0, 50).padEnd(50)} | ${String(r.tPg).padStart(5)}ms | ${String(r.tMem).padStart(5)}ms | ${(r.overlap * 100).toFixed(0)}%`
    );
    mediaOverlap += r.overlap;
    mediaPg += r.tPg;
    mediaMem += r.tMem;
  }
  const n = resultados.length;
  console.log(`---------------------------------------------------|-------|-------|--------`);
  console.log(
    `MEDIA${' '.repeat(45)} | ${String(Math.round(mediaPg / n)).padStart(5)}ms | ${String(Math.round(mediaMem / n)).padStart(5)}ms | ${((mediaOverlap / n) * 100).toFixed(0)}%`
  );

  const passou = mediaOverlap / n >= 0.8;
  console.log(`\n[SMOKE] ${passou ? 'PASSED' : 'FAILED'} (criterio: overlap medio >= 80%)`);

  await prisma.$disconnect();
  if (!passou) process.exit(1);
}

main().catch(async (err) => {
  console.error('[SMOKE] Erro fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
