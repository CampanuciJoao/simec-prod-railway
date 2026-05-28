-- LlmCallLog: tabela dedicada de chamadas LLM (OpenAI/Gemini/embedding)
-- com custo USD calculado, duracao em ms, status (ok/fallback/error).
-- Substitui o LogAuditoria 'LLM_USAGE' que nao tinha custo nem duracao.

CREATE TABLE "llm_call_log" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,8) NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_call_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "llm_call_log_tenant_id_created_at_idx" ON "llm_call_log"("tenant_id", "created_at");
CREATE INDEX "llm_call_log_feature_created_at_idx" ON "llm_call_log"("feature", "created_at");
CREATE INDEX "llm_call_log_provider_status_created_at_idx" ON "llm_call_log"("provider", "status", "created_at");
CREATE INDEX "llm_call_log_created_at_idx" ON "llm_call_log"("created_at");

ALTER TABLE "llm_call_log" ADD CONSTRAINT "llm_call_log_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
