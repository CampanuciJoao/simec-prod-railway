-- Migration: add_os_corretiva_module
-- Adds OsCorretiva, VisitaTerceiro models and extends NotaAndamento

-- Enums
CREATE TYPE "StatusOsCorretiva" AS ENUM ('Aberta', 'EmAndamento', 'AguardandoTerceiro', 'Concluida');
CREATE TYPE "StatusVisitaTerceiro" AS ENUM ('Agendada', 'EmExecucao', 'Concluida', 'PrazoEstendido');
CREATE TYPE "ResultadoVisita" AS ENUM ('Operante', 'PrazoEstendido', 'Pendente');
CREATE TYPE "TipoOsCorretiva" AS ENUM ('Ocorrencia', 'Corretiva');

-- OsCorretiva table
CREATE TABLE "os_corretivas" (
    "id"                            TEXT NOT NULL,
    "tenantId"                      TEXT NOT NULL,
    "numero_os"                     TEXT NOT NULL,
    "equipamento_id"                TEXT NOT NULL,
    "solicitante"                   TEXT NOT NULL,
    "descricao_problema"            TEXT NOT NULL,
    "status_equipamento_abertura"   "StatusEquipamento" NOT NULL,
    "data_hora_abertura"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"                        "StatusOsCorretiva" NOT NULL DEFAULT 'Aberta',
    "tipo"                          "TipoOsCorretiva" NOT NULL DEFAULT 'Ocorrencia',
    "data_hora_conclusao"           TIMESTAMP(3),
    "observacoes_finais"            TEXT,
    "autor_id"                      TEXT,
    "createdAt"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_corretivas_pkey" PRIMARY KEY ("id")
);

-- VisitaTerceiro table
CREATE TABLE "visitas_terceiro" (
    "id"                          TEXT NOT NULL,
    "tenantId"                    TEXT NOT NULL,
    "os_corretiva_id"             TEXT NOT NULL,
    "prestador_nome"              TEXT NOT NULL,
    "data_hora_inicio_prevista"   TIMESTAMP(3) NOT NULL,
    "data_hora_fim_prevista"      TIMESTAMP(3) NOT NULL,
    "data_hora_inicio_real"       TIMESTAMP(3),
    "data_hora_fim_real"          TIMESTAMP(3),
    "status"                      "StatusVisitaTerceiro" NOT NULL DEFAULT 'Agendada',
    "resultado"                   "ResultadoVisita",
    "observacoes"                 TEXT,
    "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitas_terceiro_pkey" PRIMARY KEY ("id")
);

-- Extend NotaAndamento: make manutencaoId nullable, add osCorretivaId and tecnicoNome
ALTER TABLE "notas_andamento" ALTER COLUMN "manutencao_id" DROP NOT NULL;
ALTER TABLE "notas_andamento" ADD COLUMN "os_corretiva_id" TEXT;
ALTER TABLE "notas_andamento" ADD COLUMN "tecnico_nome" TEXT;

-- Unique constraints
CREATE UNIQUE INDEX "os_corretivas_tenantId_numero_os_key" ON "os_corretivas"("tenantId", "numero_os");
CREATE UNIQUE INDEX "os_corretivas_tenantId_id_key" ON "os_corretivas"("tenantId", "id");
CREATE UNIQUE INDEX "visitas_terceiro_tenantId_id_key" ON "visitas_terceiro"("tenantId", "id");

-- Indexes
CREATE INDEX "os_corretivas_tenantId_equipamento_id_status_idx" ON "os_corretivas"("tenantId", "equipamento_id", "status");
CREATE INDEX "os_corretivas_tenantId_status_idx" ON "os_corretivas"("tenantId", "status");
CREATE INDEX "os_corretivas_tenantId_tipo_idx" ON "os_corretivas"("tenantId", "tipo");
CREATE INDEX "os_corretivas_tenantId_data_hora_abertura_idx" ON "os_corretivas"("tenantId", "data_hora_abertura" DESC);
CREATE INDEX "visitas_terceiro_tenantId_os_corretiva_id_idx" ON "visitas_terceiro"("tenantId", "os_corretiva_id");
CREATE INDEX "visitas_terceiro_tenantId_status_idx" ON "visitas_terceiro"("tenantId", "status");
CREATE INDEX "notas_andamento_tenantId_os_corretiva_id_data_idx" ON "notas_andamento"("tenantId", "os_corretiva_id", "data");

-- Foreign keys: OsCorretiva
ALTER TABLE "os_corretivas" ADD CONSTRAINT "os_corretivas_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "os_corretivas" ADD CONSTRAINT "os_corretivas_tenantId_equipamento_id_fkey"
    FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "os_corretivas" ADD CONSTRAINT "os_corretivas_autor_id_fkey"
    FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: VisitaTerceiro
ALTER TABLE "visitas_terceiro" ADD CONSTRAINT "visitas_terceiro_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visitas_terceiro" ADD CONSTRAINT "visitas_terceiro_tenantId_os_corretiva_id_fkey"
    FOREIGN KEY ("tenantId", "os_corretiva_id") REFERENCES "os_corretivas"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign key: NotaAndamento -> OsCorretiva
ALTER TABLE "notas_andamento" ADD CONSTRAINT "notas_andamento_tenantId_os_corretiva_id_fkey"
    FOREIGN KEY ("tenantId", "os_corretiva_id") REFERENCES "os_corretivas"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
