CREATE TABLE "historico_ativo_eventos" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "equipamento_id" TEXT NOT NULL,
  "tipo_evento" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "subcategoria" TEXT,
  "titulo" TEXT NOT NULL,
  "descricao" TEXT,
  "origem" TEXT NOT NULL DEFAULT 'sistema',
  "status" TEXT,
  "impacta_analise" BOOLEAN NOT NULL DEFAULT false,
  "referencia_id" TEXT,
  "referencia_tipo" TEXT,
  "metadata_json" TEXT,
  "data_evento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "historico_ativo_eventos_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "historico_ativo_eventos"
ADD CONSTRAINT "historico_ativo_eventos_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "historico_ativo_eventos"
ADD CONSTRAINT "historico_ativo_eventos_equipamento_id_fkey"
FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "historico_ativo_eventos_tenantId_equipamento_id_data_evento_idx"
ON "historico_ativo_eventos"("tenantId", "equipamento_id", "data_evento" DESC);

CREATE INDEX "historico_ativo_eventos_tenantId_categoria_data_evento_idx"
ON "historico_ativo_eventos"("tenantId", "categoria", "data_evento" DESC);

CREATE INDEX "historico_ativo_eventos_tenantId_impacta_analise_data_evento_idx"
ON "historico_ativo_eventos"("tenantId", "impacta_analise", "data_evento" DESC);

INSERT INTO "historico_ativo_eventos" (
  "id",
  "tenantId",
  "equipamento_id",
  "tipo_evento",
  "categoria",
  "subcategoria",
  "titulo",
  "descricao",
  "origem",
  "status",
  "impacta_analise",
  "referencia_id",
  "referencia_tipo",
  "metadata_json",
  "data_evento"
)
SELECT
  gen_random_uuid()::text,
  e."tenantId",
  e."id",
  'equipamento_criado',
  CASE
    WHEN e."data_instalacao" IS NOT NULL THEN 'instalacao'
    ELSE 'alteracao_cadastral'
  END,
  CASE
    WHEN e."data_instalacao" IS NOT NULL THEN 'instalacao_inicial'
    ELSE 'criacao_ativo'
  END,
  CASE
    WHEN e."data_instalacao" IS NOT NULL THEN 'Instalacao inicial registrada'
    ELSE 'Ativo cadastrado no sistema'
  END,
  CONCAT(
    'Ativo ',
    COALESCE(e."modelo", 'Sem modelo'),
    ' (',
    COALESCE(e."tag", 'Sem TAG'),
    ') vinculado a unidade ',
    COALESCE(u."nomeSistema", 'N/A'),
    '.'
  ),
  'sistema',
  e."status"::text,
  false,
  e."id",
  'equipamento',
  json_build_object(
    'modelo', e."modelo",
    'tag', e."tag",
    'unidadeId', e."unidadeId",
    'unidadeNome', u."nomeSistema",
    'dataInstalacao', e."data_instalacao"
  )::text,
  COALESCE(e."data_instalacao", e."createdAt")
FROM "equipamentos" e
LEFT JOIN "unidades" u
  ON u."id" = e."unidadeId"
 AND u."tenantId" = e."tenantId";

INSERT INTO "historico_ativo_eventos" (
  "id",
  "tenantId",
  "equipamento_id",
  "tipo_evento",
  "categoria",
  "subcategoria",
  "titulo",
  "descricao",
  "origem",
  "status",
  "impacta_analise",
  "referencia_id",
  "referencia_tipo",
  "metadata_json",
  "data_evento"
)
SELECT
  gen_random_uuid()::text,
  m."tenantId",
  m."equipamento_id",
  'manutencao_registrada',
  'manutencao',
  m."tipo_manutencao"::text,
  CONCAT('OS ', COALESCE(m."numero_os", 'Sem numero'), ' registrada'),
  m."descricao_problema_servico",
  'sistema',
  m."status"::text,
  CASE
    WHEN m."tipo_manutencao" = 'Corretiva' THEN true
    ELSE false
  END,
  m."id",
  'manutencao',
  json_build_object(
    'numeroOS', m."numero_os",
    'tipo', m."tipo_manutencao",
    'status', m."status",
    'dataInicioPlanejada', m."data_hora_agendamento_inicio",
    'dataFimPlanejada', m."data_hora_agendamento_fim"
  )::text,
  COALESCE(m."data_conclusao", m."data_hora_agendamento_inicio", m."createdAt")
FROM "manutencoes" m;

INSERT INTO "historico_ativo_eventos" (
  "id",
  "tenantId",
  "equipamento_id",
  "tipo_evento",
  "categoria",
  "subcategoria",
  "titulo",
  "descricao",
  "origem",
  "status",
  "impacta_analise",
  "referencia_id",
  "referencia_tipo",
  "metadata_json",
  "data_evento"
)
SELECT
  gen_random_uuid()::text,
  o."tenantId",
  o."equipamentoId",
  'ocorrencia_registrada',
  'ocorrencia',
  o."tipo",
  o."titulo",
  o."descricao",
  COALESCE(o."origem", 'usuario'),
  CASE
    WHEN o."resolvido" THEN 'Resolvido'
    ELSE 'Pendente'
  END,
  CASE
    WHEN o."tipo" IN ('Operacional', 'Falha') THEN true
    ELSE false
  END,
  o."id",
  'ocorrencia',
  json_build_object(
    'tipo', o."tipo",
    'gravidade', o."gravidade",
    'tecnico', o."tecnico",
    'metadata', o."metadata"
  )::text,
  o."data"
FROM "Ocorrencia" o;

INSERT INTO "historico_ativo_eventos" (
  "id",
  "tenantId",
  "equipamento_id",
  "tipo_evento",
  "categoria",
  "subcategoria",
  "titulo",
  "descricao",
  "origem",
  "status",
  "impacta_analise",
  "referencia_id",
  "referencia_tipo",
  "metadata_json",
  "data_evento"
)
SELECT
  gen_random_uuid()::text,
  o."tenantId",
  o."equipamentoId",
  'ocorrencia_resolvida',
  'ocorrencia',
  'resolucao',
  CONCAT('Resolucao da ocorrencia: ', COALESCE(o."titulo", 'Evento')),
  o."solucao",
  COALESCE(o."origem", 'usuario'),
  'Resolvido',
  false,
  o."id",
  'ocorrencia',
  json_build_object(
    'tipo', o."tipo",
    'tecnicoResolucao', o."tecnicoResolucao",
    'dataResolucao', o."dataResolucao"
  )::text,
  o."dataResolucao"
FROM "Ocorrencia" o
WHERE o."resolvido" = true
  AND o."dataResolucao" IS NOT NULL;
