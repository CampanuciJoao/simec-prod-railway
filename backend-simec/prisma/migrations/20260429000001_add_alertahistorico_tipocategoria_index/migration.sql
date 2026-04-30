-- Add compound index on AlertaHistorico for tipoCategoria + dataAlerta filtering
CREATE INDEX IF NOT EXISTS "alertas_historico_tenant_tipo_categoria_data_idx"
  ON "alertas_historico" ("tenantId", "tipo_categoria", "data_alerta" DESC);
