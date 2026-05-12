-- Knowledge Layer: timeline unificada de eventos por equipamento.
-- Recebe entradas de 5 fontes (PDF GE extraido, telemetria GE, OS interna SIMEC,
-- visita de terceiro, alerta de saude) e materializa um formato comum para que
-- o modelo preditivo e o RAG do chatbot consumam tudo via uma unica query.
--
-- Idempotencia: unique parcial em (refFonteTipo, refFonteId, tipoEvento) impede
-- duplicacao mesmo se o produtor rodar varias vezes. Cada linha tem uma origem
-- rastreavel — auditoria de "de onde a IA tirou essa informacao".
--
-- Esta tabela NAO substitui as tabelas de origem; e uma materializacao read-only
-- mantida pelo knowledgeLayerSync. Pode ser truncada e reconstruida sem perda
-- de dados.

CREATE TABLE "evento_equipamento" (
  "id"             TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "equipamento_id" TEXT NOT NULL,

  "ocorrido_em"     TIMESTAMP(3) NOT NULL,
  "fonte"           TEXT NOT NULL,
  "tipo_evento"     TEXT NOT NULL,
  "severidade"      TEXT NOT NULL DEFAULT 'info',
  "causa_categoria" TEXT,
  "resumo"          TEXT NOT NULL,
  "detalhes_json"   JSONB,

  "ref_fonte_tipo" TEXT NOT NULL,
  "ref_fonte_id"   TEXT NOT NULL,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "evento_equipamento_pkey" PRIMARY KEY ("id")
);

-- Idempotencia: 1 linha por (origem, tipo_evento). Se o mesmo PDF gerar tanto
-- "pdf_ge_corretiva" quanto "pdf_ge_acionamento_engenheiro" (futuro), os dois
-- coexistem.
CREATE UNIQUE INDEX "evento_equipamento_origem_tipo_key"
  ON "evento_equipamento"("ref_fonte_tipo", "ref_fonte_id", "tipo_evento");

CREATE INDEX "evento_equipamento_tenant_eq_ocorrido_idx"
  ON "evento_equipamento"("tenantId", "equipamento_id", "ocorrido_em" DESC);

CREATE INDEX "evento_equipamento_tenant_fonte_idx"
  ON "evento_equipamento"("tenantId", "fonte", "ocorrido_em" DESC);

CREATE INDEX "evento_equipamento_tenant_categoria_idx"
  ON "evento_equipamento"("tenantId", "causa_categoria");

CREATE INDEX "evento_equipamento_tenant_severidade_idx"
  ON "evento_equipamento"("tenantId", "severidade", "ocorrido_em" DESC);

ALTER TABLE "evento_equipamento"
  ADD CONSTRAINT "evento_equipamento_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evento_equipamento"
  ADD CONSTRAINT "evento_equipamento_eq_fkey"
  FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
