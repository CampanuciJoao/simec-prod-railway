-- Adiciona coluna seguro_anterior_id para rastrear cadeia de renovações
ALTER TABLE "seguros" ADD COLUMN IF NOT EXISTS "seguro_anterior_id" TEXT;

-- FK self-referencial (nullable — seguros originais não têm antecessor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seguros_seguro_anterior_id_fkey'
  ) THEN
    ALTER TABLE "seguros"
      ADD CONSTRAINT "seguros_seguro_anterior_id_fkey"
      FOREIGN KEY ("seguro_anterior_id") REFERENCES "seguros"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Status Substituido — seguro que foi substituído por renovação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'StatusSeguro' AND pg_enum.enumlabel = 'Substituido'
  ) THEN
    ALTER TYPE "StatusSeguro" ADD VALUE 'Substituido';
  END IF;
END $$;

-- Índice para navegar a cadeia de renovações
CREATE INDEX IF NOT EXISTS "seguros_seguro_anterior_id_idx"
  ON "seguros"("seguro_anterior_id")
  WHERE "seguro_anterior_id" IS NOT NULL;
