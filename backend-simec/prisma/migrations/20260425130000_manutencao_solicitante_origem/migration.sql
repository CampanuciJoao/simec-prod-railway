-- Migration: manutencao_solicitante_origem
-- Adiciona campos solicitante e origemAbertura para rastreio de quem relatou o problema

ALTER TABLE "manutencoes"
  ADD COLUMN "solicitante" TEXT,
  ADD COLUMN "origem_abertura" TEXT;
