-- Seed do catalogo padrao de tipos de teste de Controle de Qualidade
-- conforme RDC ANVISA 611/2022 + IN 90/2021. Replica para todos tenants
-- existentes (multi-tenant). Idempotente: ON CONFLICT DO NOTHING via
-- unique (tenantId, codigo).

-- Helper: cria registros para todos os tenants ativos.
-- NOTA: gen_random_uuid() requer pgcrypto (vem default no Postgres 13+ no Railway).

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
  -- ── Mamografia (RDC 611/2022 + IN 90/2021) ─────────────────────────────
  ('MAMO_PHANTOM_MENSAL', 'Avaliacao mensal com phantom mamografico',
    'Mamografia', 30, true, 'IN 90/2021', 'Tecnico/Operador',
    'Avaliacao da qualidade da imagem com phantom padrao. Periodicidade mensal.'),
  ('MAMO_TCQ_ANUAL', 'Testes de Constancia (TC)',
    'Mamografia', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Bateria de testes anuais: kVp, mAs, dose glandular, qualidade da imagem, etc.'),
  ('MAMO_EPI_ANUAL', 'Avaliacao de integridade de EPIs plumbiferos',
    'Mamografia', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Avaliacao de aventais e protetores de tireoide. Itens nao integros devem ser retirados de operacao.'),
  ('MAMO_LR_QUADRIENAL', 'Levantamento Radiometrico Ambiental (LR)',
    'Mamografia', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Medicao dos niveis de radiacao em pontos da instalacao. Validade 4 anos desde que nao haja alteracao no lay-out.'),
  ('MAMO_CBC_QUADRIENAL', 'Certificado de Blindagem do Cabecote (CBC) / Radiacao de Fuga',
    'Mamografia', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Verifica radiacao de fuga do cabecote em 5 pontos. Validade 4 anos desde que nao haja manutencao no cabecote.'),

  -- ── Tomografia Computadorizada ─────────────────────────────────────────
  ('TC_AGUA_DIARIO', 'Calibracao de agua (HU 0±4)',
    'Tomografia Computadorizada', 1, true, 'IN 90/2021', 'Operador',
    'Verificacao diaria do numero de CT da agua (0 ± 4 HU).'),
  ('TC_PHANTOM_MENSAL', 'Phantom (ruido, uniformidade, artefatos)',
    'Tomografia Computadorizada', 30, true, 'IN 90/2021', 'Tecnico',
    'Avaliacao mensal de ruido, uniformidade do numero de CT e artefatos.'),
  ('TC_TCQ_ANUAL', 'Testes de Constancia',
    'Tomografia Computadorizada', 365, true, 'RDC 611/2022', 'Fisico medico',
    'TC completo: alinhamento, espessura de corte, ruido, dose (CTDI), etc.'),
  ('TC_EPI_ANUAL', 'Avaliacao de integridade de EPIs plumbiferos',
    'Tomografia Computadorizada', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Avaliacao de aventais e protetores. Aplicavel em sala com protecao adicional.'),
  ('TC_LR_QUADRIENAL', 'Levantamento Radiometrico Ambiental',
    'Tomografia Computadorizada', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Medicao dos niveis de radiacao em pontos da instalacao. Validade 4 anos.'),

  -- ── Raio-X / Fluoroscopia / Arco Cirurgico ─────────────────────────────
  ('RX_TCQ_ANUAL', 'Testes de Constancia',
    'Raio-X', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Exatidao kVp, tempo, mAs, filtracao (CSR), reprodutibilidade, alinhamento, etc.'),
  ('RX_EPI_ANUAL', 'Avaliacao de integridade de EPIs plumbiferos',
    'Raio-X', 365, true, 'RDC 611/2022', 'Fisico medico',
    'Avaliacao de aventais e protetores de tireoide.'),
  ('RX_LR_QUADRIENAL', 'Levantamento Radiometrico Ambiental',
    'Raio-X', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Medicao dos niveis de radiacao em pontos da instalacao. Validade 4 anos.'),
  ('RX_FUGA_QUADRIENAL', 'Radiacao de Fuga do Cabecote',
    'Raio-X', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Verifica radiacao de fuga do invocluro do tubo. Validade 4 anos.'),

  -- ── Densitometria Ossea com Raio-X ─────────────────────────────────────
  ('DENSI_TC_ANUAL', 'Testes de Constancia (phantom calibracao)',
    'Densitometro Osseo', 365, true, 'RDC 611/2022', 'Fisico medico',
    'TC anual com phantom de calibracao do densitometro.'),
  ('DENSI_LR_QUADRIENAL', 'Levantamento Radiometrico Ambiental',
    'Densitometro Osseo', 1460, true, 'RDC 611/2022', 'Fisico medico',
    'Medicao dos niveis de radiacao em pontos da instalacao. Validade 4 anos.'),

  -- ── Ressonancia Magnetica (recomendacao ABNT/CBR, nao regulado) ────────
  ('RM_QC_ANUAL', 'Controle de Qualidade Anual (ACR phantom)',
    'Ressonancia Magnetica', 365, false, 'CBR (recomendacao)', 'Fisico medico',
    'CQ anual recomendado pelo CBR/ABNT. Nao regulado por RDC 611 (sem radiacao ionizante).'),

  -- ── Ultrassom (recomendacao CBR, nao regulado) ─────────────────────────
  ('US_QC_ANUAL', 'Avaliacao anual de transdutores',
    'Ultrassom', 365, false, 'CBR (recomendacao)', 'Eng. Clinico/Tecnico',
    'Avaliacao de transdutores e qualidade de imagem. Recomendacao do CBR.')
) AS c (codigo, nome, modalidade, frequencia_dias, obrigatorio, norma_referencia, responsavel_tipico, descricao)
WHERE t.ativo = true
ON CONFLICT ("tenantId", "codigo") DO NOTHING;
