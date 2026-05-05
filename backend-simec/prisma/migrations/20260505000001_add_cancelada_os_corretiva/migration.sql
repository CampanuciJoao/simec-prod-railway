-- Add Cancelada to StatusOsCorretiva enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'Cancelada'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatusOsCorretiva')
  ) THEN
    ALTER TYPE "StatusOsCorretiva" ADD VALUE 'Cancelada';
  END IF;
END$$;

-- Add motivo_cancelamento column (idempotent)
ALTER TABLE "os_corretivas" ADD COLUMN IF NOT EXISTS "motivo_cancelamento" TEXT;

-- Add data_hora_cancelamento column (idempotent)
ALTER TABLE "os_corretivas" ADD COLUMN IF NOT EXISTS "data_hora_cancelamento" TIMESTAMP(3);
