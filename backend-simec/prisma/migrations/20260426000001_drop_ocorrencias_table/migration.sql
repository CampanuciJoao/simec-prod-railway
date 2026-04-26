-- Migration: drop_ocorrencias_table
-- Remove the legacy Ocorrencia model (replaced by the OsCorretiva module)

DROP TABLE IF EXISTS "Ocorrencia";
