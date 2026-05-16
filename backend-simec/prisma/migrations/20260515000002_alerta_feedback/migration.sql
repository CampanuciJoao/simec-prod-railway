-- AlertaFeedback: feedback do usuário sobre recomendações inteligentes
-- (👍 útil / 👎 não-útil + comentário opcional). 1 feedback por usuário
-- por alerta — upsert atualiza o existente.

CREATE TABLE "alerta_feedback" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "alertaId"    TEXT NOT NULL,
    "usuarioId"   TEXT NOT NULL,
    "util"        BOOLEAN NOT NULL,
    "comentario"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerta_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "alerta_feedback_tenantId_alertaId_usuarioId_key"
  ON "alerta_feedback"("tenantId", "alertaId", "usuarioId");

CREATE INDEX "alerta_feedback_tenantId_util_idx"
  ON "alerta_feedback"("tenantId", "util");

CREATE INDEX "alerta_feedback_tenantId_createdAt_idx"
  ON "alerta_feedback"("tenantId", "createdAt" DESC);

ALTER TABLE "alerta_feedback"
  ADD CONSTRAINT "alerta_feedback_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alerta_feedback"
  ADD CONSTRAINT "alerta_feedback_tenantId_alertaId_fkey"
  FOREIGN KEY ("tenantId", "alertaId") REFERENCES "alertas"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alerta_feedback"
  ADD CONSTRAINT "alerta_feedback_tenantId_usuarioId_fkey"
  FOREIGN KEY ("tenantId", "usuarioId") REFERENCES "usuarios"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
