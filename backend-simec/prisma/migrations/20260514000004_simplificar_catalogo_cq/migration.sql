-- Simplifica o catalogo de tipos de teste de CQ.
--
-- Catalogo anterior tinha 18 testes especificos por modalidade
-- (MAMO_PHANTOM_MENSAL, TC_AGUA_DIARIO, MAMO_CBC_QUADRIENAL, etc.).
-- Reflexao com o cliente mostrou que essa granularidade nao reflete a
-- pratica do mercado: empresas brasileiras de fisica medica entregam
-- relatorios consolidados que cobrem multiplas frentes em um unico PDF,
-- usando 3 categorias principais:
--
--   CQ  — Controle de Qualidade (umbrella: testes fisicos do equipamento,
--         constancia, dose, uniformidade, espessura de corte, etc.).
--         Usado quando o laudo cobre varias frentes em um documento unico.
--   LR  — Levantamento Radiometrico Ambiental (radiacao saindo das salas).
--         Quadrienal. Nao se aplica a RM e US.
--   EPI — Eficiencia de Blindagem (integridade de aventais e protetores
--         de tireoide). Anual.
--
-- Estrategia: NAO deletar os tipos antigos (FK ON DELETE RESTRICT
-- impediria, e haveria perda de auditoria de testes ja registrados).
-- Apenas seta ativo=false para que sumam dos selects de cadastro novo.
-- Testes antigos vinculados continuam funcionando para o historico.

-- 1. Desativa todo o catalogo seed antigo (codigos com prefixos das modalidades)
UPDATE "tipos_testes_qualidade"
SET "ativo" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "codigo" IN (
  'MAMO_PHANTOM_MENSAL', 'MAMO_TCQ_ANUAL', 'MAMO_EPI_ANUAL',
  'MAMO_LR_QUADRIENAL', 'MAMO_CBC_QUADRIENAL',
  'TC_AGUA_DIARIO', 'TC_PHANTOM_MENSAL', 'TC_TCQ_ANUAL',
  'TC_EPI_ANUAL', 'TC_LR_QUADRIENAL',
  'RX_TCQ_ANUAL', 'RX_EPI_ANUAL', 'RX_LR_QUADRIENAL', 'RX_FUGA_QUADRIENAL',
  'DENSI_TC_ANUAL', 'DENSI_LR_QUADRIENAL',
  'RM_QC_ANUAL',
  'US_QC_ANUAL'
);

-- 2. Insere o novo catalogo simplificado para todos os tenants ativos.
--    ON CONFLICT DO NOTHING nao funciona para o codigo ja existente em outro
--    tenant — usa-se o unique (tenantId, codigo) que ja garante isso.
INSERT INTO "tipos_testes_qualidade" (
  "id", "tenantId", "codigo", "nome", "modalidade",
  "frequencia_dias", "obrigatorio", "norma_referencia", "responsavel_tipico",
  "descricao", "ativo", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, t.id, c.codigo, c.nome, c.modalidade,
  c.frequencia_dias, c.obrigatorio, c.norma_referencia, c.responsavel_tipico,
  c.descricao, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" t
CROSS JOIN (VALUES
  -- ── Mamografia ─────────────────────────────────────────────────────────
  ('CQ_MAMO',  'Controle de Qualidade — Mamografia',
    'Mamografia', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Bateria anual de testes fisicos: kVp, mAs, dose glandular, qualidade da imagem, phantom, etc. Usar quando o laudo abrange varias frentes em um documento unico.'),
  ('LR_MAMO',  'Levantamento Radiometrico Ambiental — Mamografia',
    'Mamografia', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Medicao dos niveis de radiacao em pontos da instalacao. Validade 4 anos desde que nao haja alteracao no lay-out.'),
  ('EPI_MAMO', 'Eficiencia de Blindagem (EPIs) — Mamografia',
    'Mamografia', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Avaliacao de aventais e protetores de tireoide. EPIs nao integros devem ser retirados de operacao.'),

  -- ── Tomografia Computadorizada ─────────────────────────────────────────
  ('CQ_TC',  'Controle de Qualidade — Tomografia Computadorizada',
    'Tomografia Computadorizada', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Bateria anual: numero de CT, ruido, dose, resolucao espacial, espessura de corte, posicionamento de mesa, etc. Usar quando o laudo abrange varias frentes.'),
  ('LR_TC',  'Levantamento Radiometrico Ambiental — TC',
    'Tomografia Computadorizada', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Medicao dos niveis de radiacao em pontos da instalacao. Validade 4 anos desde que nao haja alteracao no lay-out.'),
  ('EPI_TC', 'Eficiencia de Blindagem (EPIs) — TC',
    'Tomografia Computadorizada', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Avaliacao de aventais e protetores de tireoide.'),

  -- ── Raio-X / Fluoroscopia / Arco Cirurgico ──────────────────────────────
  ('CQ_RX',  'Controle de Qualidade — Raio-X',
    'Raio-X', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Bateria anual: kVp, mAs, exatidao do indicador, alinhamento, radiacao de fuga do cabecote, etc.'),
  ('LR_RX',  'Levantamento Radiometrico Ambiental — Raio-X',
    'Raio-X', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Medicao dos niveis de radiacao em pontos da instalacao. Validade 4 anos.'),
  ('EPI_RX', 'Eficiencia de Blindagem (EPIs) — Raio-X',
    'Raio-X', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Avaliacao de aventais e protetores de tireoide.'),

  -- ── Densitometria Ossea ─────────────────────────────────────────────────
  ('CQ_DENSI',  'Controle de Qualidade — Densitometria Ossea',
    'Densitometro Osseo', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Bateria anual de testes fisicos com phantom de calibracao.'),
  ('LR_DENSI',  'Levantamento Radiometrico Ambiental — Densitometria',
    'Densitometro Osseo', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Medicao dos niveis de radiacao em pontos da instalacao. Validade 4 anos.'),
  ('EPI_DENSI', 'Eficiencia de Blindagem (EPIs) — Densitometria',
    'Densitometro Osseo', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Avaliacao de aventais e protetores de tireoide.'),

  -- ── Ressonancia Magnetica (recomendacao CBR — nao regulado por RDC 611) ─
  ('CQ_RM', 'Controle de Qualidade — Ressonancia Magnetica',
    'Ressonancia Magnetica', 365, false, 'CBR (recomendacao)', 'Fisico medico',
    'Controle anual com phantom ACR. Nao eh exigido pela RDC 611 — recomendacao do CBR.'),

  -- ── Ultrassom (recomendacao CBR — nao regulado por RDC 611) ─────────────
  ('CQ_US', 'Controle de Qualidade — Ultrassom',
    'Ultrassom', 365, false, 'CBR (recomendacao)', 'Engenheiro clinico/Tecnico',
    'Avaliacao anual de transdutores. Nao eh exigido pela RDC 611 — recomendacao do CBR.')
) AS c (
  codigo, nome, modalidade,
  frequencia_dias, obrigatorio, norma_referencia, responsavel_tipico,
  descricao
)
ON CONFLICT ("tenantId", "codigo") DO NOTHING;
