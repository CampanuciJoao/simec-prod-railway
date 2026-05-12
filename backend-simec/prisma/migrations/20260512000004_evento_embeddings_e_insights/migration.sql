-- IA preditiva + RAG: embeddings dos eventos + insights gerados.
--
-- Estrategia de armazenamento: JSONB com array de floats (1536 dimensoes do
-- text-embedding-3-small da OpenAI). Para datasets ate ~10k eventos, similaridade
-- coseno calculada na aplicacao (Node) e tranquila. Quando passar disso, migracao
-- para pgvector vira PR isolado — basta `ALTER COLUMN embedding TYPE vector USING ...`.
--
-- Dois propositos:
--   1. RAG do chatbot: busca top-K eventos similares ao texto do usuario e
--      injeta como contexto na resposta.
--   2. Detector de padroes: agrupar eventos por similaridade revela cluster
--      de causa-raiz mesmo quando texto livre varia.
--
-- 1:1 com evento_equipamento. Indice GIN no jsonb embedding para queries que
-- filtrem por dimensao especifica (raro, mas possivel).

CREATE TABLE "evento_equipamento_embedding" (
  "id"                    TEXT NOT NULL,
  "tenantId"              TEXT NOT NULL,
  "evento_equipamento_id" TEXT NOT NULL,

  "embedding"             JSONB NOT NULL,
  "model"                 TEXT NOT NULL,
  "dim"                   INTEGER NOT NULL,
  "input_text"            TEXT NOT NULL,

  "gerado_em"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "evento_equipamento_embedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evento_equipamento_embedding_evento_id_key"
  ON "evento_equipamento_embedding"("evento_equipamento_id");

CREATE INDEX "evento_equipamento_embedding_tenantId_idx"
  ON "evento_equipamento_embedding"("tenantId");

ALTER TABLE "evento_equipamento_embedding"
  ADD CONSTRAINT "evento_equipamento_embedding_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evento_equipamento_embedding"
  ADD CONSTRAINT "evento_equipamento_embedding_evento_id_fkey"
  FOREIGN KEY ("evento_equipamento_id") REFERENCES "evento_equipamento"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Insights gerados pela IA: recomendacoes operacionais derivadas dos padroes
-- encontrados em evento_equipamento. Persistidas em vez de regeradas a cada
-- request (estaveis durante a janela de validade).
--
-- Tipos esperados:
--   reincidencia_causa  - causa-raiz se repete N vezes em janela X
--   anomalia_helio      - tendencia anormal de queda de helio
--   risco_alto          - score de risco preditivo cruzou limiar
--   sem_pm_recente      - equipamento sem PM ha > X dias
--   acionamento_freq_terceiro - terceiro acionado N vezes em janela X

CREATE TABLE "ia_insights" (
  "id"             TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "equipamento_id" TEXT NOT NULL,

  "tipo"           TEXT NOT NULL,
  "severidade"     TEXT NOT NULL DEFAULT 'medium',
  "titulo"         TEXT NOT NULL,
  "descricao"      TEXT NOT NULL,
  "recomendacao"   TEXT,
  "evidencia_json" JSONB,

  "gerado_em"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valido_ate"     TIMESTAMP(3),
  "resolvido_em"   TIMESTAMP(3),
  "feedback_util"  BOOLEAN,
  "feedback_em"    TIMESTAMP(3),

  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ia_insights_pkey" PRIMARY KEY ("id")
);

-- Idempotencia: 1 insight ativo por (equipamento, tipo). Quando regerar, update.
CREATE UNIQUE INDEX "ia_insights_equipamento_tipo_ativo_key"
  ON "ia_insights"("equipamento_id", "tipo")
  WHERE "resolvido_em" IS NULL;

CREATE INDEX "ia_insights_tenant_severidade_idx"
  ON "ia_insights"("tenantId", "severidade", "gerado_em" DESC);

CREATE INDEX "ia_insights_tenant_resolvido_idx"
  ON "ia_insights"("tenantId", "resolvido_em");

ALTER TABLE "ia_insights"
  ADD CONSTRAINT "ia_insights_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ia_insights"
  ADD CONSTRAINT "ia_insights_equipamento_fkey"
  FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
