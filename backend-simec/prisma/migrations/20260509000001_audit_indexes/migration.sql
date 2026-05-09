-- audit_indexes: indexes de performance baseados na auditoria tecnica 2026-05-09

-- Alerta: substituir index simples por composto com createdAt (queries de notificacao por email)
DROP INDEX IF EXISTS "alertas_tenantId_emailEnviado_idx";
CREATE INDEX IF NOT EXISTS "alertas_tenantId_emailEnviado_createdAt_idx" ON "alertas"("tenantId", "emailEnviado", "createdAt" DESC);

-- HistoricoAtivoEvento: index para busca eficiente por referencia (seguro, contrato, manutencao)
CREATE INDEX IF NOT EXISTS "historico_ativo_eventos_tenantId_referencia_id_referencia_tipo_idx" ON "historico_ativo_eventos"("tenantId", referencia_id, referencia_tipo);

-- GehcAlertaSuspensao: index composto para verificacao de suspensoes ativas por equipamento
CREATE INDEX IF NOT EXISTS "gehc_alerta_suspensoes_tenantId_equipamento_id_suspenso_ate_idx" ON "gehc_alerta_suspensoes"("tenantId", equipamento_id, suspenso_ate);
