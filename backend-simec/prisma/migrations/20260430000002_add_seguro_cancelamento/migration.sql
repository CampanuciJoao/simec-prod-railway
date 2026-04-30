-- Armazena o motivo quando um seguro é cancelado manualmente.
-- Permite auditoria e histórico de cancelamentos acessível via GET /seguros/:id/historico.
ALTER TABLE "seguros" ADD COLUMN IF NOT EXISTS "motivo_cancelamento" TEXT;
