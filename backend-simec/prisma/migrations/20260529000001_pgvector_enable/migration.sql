-- Habilita extensao pgvector e adiciona coluna embedding_vec vector(1536)
-- AO LADO da coluna embedding (JSON). Compat backward: durante o
-- backfill, busca pode usar uma ou outra. Drop da coluna JSON eh
-- migration separada em fase futura.
--
-- Por que pgvector:
--  - similaridade in-memory atual eh O(n*d) por query, carrega todo
--    candidato pra Node — gargalo a partir de ~10k eventos por tenant
--  - pgvector + indice IVFFlat faz busca aproximada O(log n) com
--    recall >95%, latencia 20-50ms mesmo com 100k+ vetores
--  - cross-tenant search (licoes despersonalizadas) escala junto
--
-- pgvector 0.8.2 ja esta available no Railway Postgres.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "evento_equipamento_embedding"
  ADD COLUMN "embedding_vec" vector(1536);

-- Indice IVFFlat (Inverted File com flat compression). lists = sqrt(N)
-- eh regra geral; comecamos com 100 (~10k vetores), reajustamos quando
-- passar de 100k. Indice eh criado MESMO COM TABELA VAZIA — funciona, e
-- conforme dados entram, basta ANALYZE periodico pra estatisticas.
--
-- vector_cosine_ops: usa cosine distance (1 - cosine similarity). Operador
-- <=> em queries. Match exato com nosso uso atual de cosineSimilarity.
CREATE INDEX "evento_equipamento_embedding_vec_idx"
  ON "evento_equipamento_embedding"
  USING ivfflat ("embedding_vec" vector_cosine_ops)
  WITH (lists = 100);

-- Indice auxiliar pra backfill — permite scan rapido de quem ainda
-- nao tem embedding_vec populado. Drop apos backfill completo.
CREATE INDEX "evento_equipamento_embedding_pending_idx"
  ON "evento_equipamento_embedding" ("id")
  WHERE "embedding_vec" IS NULL;
