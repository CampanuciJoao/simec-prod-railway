-- Adiciona ART do Elevador como 6o tipo de servico predial.
-- ART (Anotacao de Responsabilidade Tecnica) e emitida anualmente
-- pelo tecnico responsavel do contrato de manutencao do elevador,
-- com registro no CREA. Obrigatoria em maioria dos municipios.
ALTER TYPE "TipoServicoPredial" ADD VALUE IF NOT EXISTS 'ArtElevador';
