-- audit_indexes: 3 performance indexes added based on audit 2026-05-09

-- Alerta: index composto para processamento de notificacoes por email
DROP INDEX IF EXISTS "alertas_tenant_id_email_enviado_idx";
CREATE INDEX "alertas_tenant_id_email_enviado_created_at_idx" ON "alertas"("tenantId", "emailEnviado", "createdAt" DESC);

-- HistoricoAtivoEvento: index para busca por referencia (seguro, contrato, manutencao)
CREATE INDEX IF NOT EXISTS "historico_ativo_eventos_tenant_id_referencia_id_referencia_tipo_idx" ON "historico_ativo_eventos"("tenantId", "referencia_id", "referencia_tipo");

-- GehcAlertaSuspensao: index composto para verificacao eficiente de suspensoes ativas
CREATE INDEX IF NOT EXISTS "gehc_alerta_suspensoes_tenant_id_equipamento_id_suspenso_ate_idx" ON "gehc_alerta_suspensoes"("tenantId", "equipamento_id", "suspenso_ate");
