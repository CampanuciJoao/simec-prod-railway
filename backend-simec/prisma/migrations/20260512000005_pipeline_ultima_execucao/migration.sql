-- Adiciona campos de telemetria da ultima execucao em ai_pipeline_estados.
-- Permite que o painel mostre status (ok/erro), quando rodou, e metricas
-- (PDFs baixados, eventos criados, etc) sem precisar acessar logs do worker.
--
-- Workers chamam aiPipelineState.registrarExecucao() ao final de cada job
-- (sucesso ou falha) e a UI le esses campos via /api/gehc/aprendizado/pipelines.

ALTER TABLE "ai_pipeline_estados"
  ADD COLUMN "ultima_execucao_em"        TIMESTAMP(3),
  ADD COLUMN "ultima_execucao_ok"        BOOLEAN,
  ADD COLUMN "ultima_execucao_mensagem"  TEXT,
  ADD COLUMN "ultima_execucao_metrics"   JSONB,
  ADD COLUMN "ultima_execucao_duracao_ms" INTEGER;
