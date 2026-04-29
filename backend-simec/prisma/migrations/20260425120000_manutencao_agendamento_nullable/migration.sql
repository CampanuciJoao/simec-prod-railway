-- Migration: manutencao_agendamento_nullable
-- Torna os campos de agendamento e descricaoProblemaServico opcionais
-- para suportar OSs Corretivas em triagem (status Pendente)

ALTER TABLE "manutencoes"
  ALTER COLUMN "descricao_problema_servico" DROP NOT NULL,
  ALTER COLUMN "agendamento_data_inicio_local" DROP NOT NULL,
  ALTER COLUMN "agendamento_hora_inicio_local" DROP NOT NULL,
  ALTER COLUMN "agendamento_data_fim_local" DROP NOT NULL,
  ALTER COLUMN "agendamento_hora_fim_local" DROP NOT NULL,
  ALTER COLUMN "agendamento_timezone" DROP NOT NULL,
  ALTER COLUMN "data_hora_agendamento_inicio" DROP NOT NULL;
