ALTER TABLE "equipamentos"
ADD COLUMN "ae_title" TEXT,
ADD COLUMN "telefone_suporte" TEXT;

CREATE UNIQUE INDEX "equipamentos_tenant_id_ae_title_key"
ON "equipamentos"("tenantId", "ae_title");

CREATE INDEX "equipamentos_tenant_id_ae_title_idx"
ON "equipamentos"("tenantId", "ae_title");

CREATE TABLE "pacs_connections" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo_adapter" TEXT NOT NULL DEFAULT 'dicomweb_qido',
  "base_url" TEXT NOT NULL,
  "credenciais" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "ultimo_teste" TIMESTAMP(3),
  "ultimo_erro" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pacs_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pacs_ingestion_runs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "equipamento_id" TEXT,
  "status" TEXT NOT NULL,
  "janela_inicio" TIMESTAMP(3) NOT NULL,
  "janela_fim" TIMESTAMP(3) NOT NULL,
  "estudos_lidos" INTEGER NOT NULL DEFAULT 0,
  "estudos_agregados" INTEGER NOT NULL DEFAULT 0,
  "latencia_ms" INTEGER,
  "erro_resumo" TEXT,
  "metadata_json" TEXT,
  "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "concluido_em" TIMESTAMP(3),

  CONSTRAINT "pacs_ingestion_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pacs_equipment_feature_daily" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "equipamento_id" TEXT NOT NULL,
  "data" TIMESTAMP(3) NOT NULL,
  "volume_estudos" INTEGER NOT NULL DEFAULT 0,
  "volume_series" INTEGER NOT NULL DEFAULT 0,
  "volume_instancias" INTEGER NOT NULL DEFAULT 0,
  "duracao_media_minutos" DOUBLE PRECISION,
  "duracao_variancia" DOUBLE PRECISION,
  "horario_pico_uso" INTEGER,
  "gap_maximo_inatividade" DOUBLE PRECISION,
  "disponibilidade" DOUBLE PRECISION,
  "mix_modalidades" TEXT,
  "tendencia_vs_semana_anterior" DOUBLE PRECISION,
  "anomalia" BOOLEAN NOT NULL DEFAULT false,
  "sinais_anomalia" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pacs_equipment_feature_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pacs_connections_tenantId_id_key"
ON "pacs_connections"("tenantId", "id");

CREATE INDEX "pacs_connections_tenantId_ativo_idx"
ON "pacs_connections"("tenantId", "ativo");

CREATE INDEX "pacs_ingestion_runs_tenantId_connection_id_iniciado_em_idx"
ON "pacs_ingestion_runs"("tenantId", "connection_id", "iniciado_em");

CREATE INDEX "pacs_ingestion_runs_tenantId_equipamento_id_iniciado_em_idx"
ON "pacs_ingestion_runs"("tenantId", "equipamento_id", "iniciado_em");

CREATE INDEX "pacs_ingestion_runs_tenantId_iniciado_em_idx"
ON "pacs_ingestion_runs"("tenantId", "iniciado_em");

CREATE UNIQUE INDEX "pacs_equipment_feature_daily_tenantId_equipamento_id_data_key"
ON "pacs_equipment_feature_daily"("tenantId", "equipamento_id", "data");

CREATE INDEX "pacs_equipment_feature_daily_tenantId_equipamento_id_data_idx"
ON "pacs_equipment_feature_daily"("tenantId", "equipamento_id", "data");

CREATE INDEX "pacs_equipment_feature_daily_tenantId_data_idx"
ON "pacs_equipment_feature_daily"("tenantId", "data");

CREATE INDEX "pacs_equipment_feature_daily_tenantId_anomalia_data_idx"
ON "pacs_equipment_feature_daily"("tenantId", "anomalia", "data");

ALTER TABLE "pacs_connections"
ADD CONSTRAINT "pacs_connections_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pacs_ingestion_runs"
ADD CONSTRAINT "pacs_ingestion_runs_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pacs_ingestion_runs"
ADD CONSTRAINT "pacs_ingestion_runs_connection_id_fkey"
FOREIGN KEY ("connection_id") REFERENCES "pacs_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pacs_equipment_feature_daily"
ADD CONSTRAINT "pacs_equipment_feature_daily_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pacs_equipment_feature_daily"
ADD CONSTRAINT "pacs_equipment_feature_daily_tenantId_equipamento_id_fkey"
FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
