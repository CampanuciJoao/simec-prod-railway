CREATE TABLE IF NOT EXISTS "orcamentos" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
  "observacao" TEXT,
  "unidadeId" TEXT,
  "criadoPorId" TEXT NOT NULL,
  "aprovadoPorId" TEXT,
  "fornecedorAprovadoId" TEXT,
  "motivoRejeicao" TEXT,
  "dataAprovacao" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "orcamentos_tenantId_status_idx"
  ON "orcamentos"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "orcamentos_tenantId_tipo_idx"
  ON "orcamentos"("tenantId", "tipo");
CREATE INDEX IF NOT EXISTS "orcamentos_tenantId_criadoPorId_idx"
  ON "orcamentos"("tenantId", "criadoPorId");
CREATE INDEX IF NOT EXISTS "orcamentos_tenantId_unidadeId_idx"
  ON "orcamentos"("tenantId", "unidadeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamentos_tenantId_fkey'
  ) THEN
    ALTER TABLE "orcamentos"
      ADD CONSTRAINT "orcamentos_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamentos_criadoPorId_fkey'
  ) THEN
    ALTER TABLE "orcamentos"
      ADD CONSTRAINT "orcamentos_criadoPorId_fkey"
      FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamentos_aprovadoPorId_fkey'
  ) THEN
    ALTER TABLE "orcamentos"
      ADD CONSTRAINT "orcamentos_aprovadoPorId_fkey"
      FOREIGN KEY ("aprovadoPorId") REFERENCES "usuarios"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamentos_unidadeId_fkey'
  ) THEN
    ALTER TABLE "orcamentos"
      ADD CONSTRAINT "orcamentos_unidadeId_fkey"
      FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "orcamento_fornecedores" (
  "id" TEXT NOT NULL,
  "orcamentoId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "formaPagamento" TEXT,
  "ordem" INTEGER NOT NULL,
  CONSTRAINT "orcamento_fornecedores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "orcamento_fornecedores_orcamentoId_idx"
  ON "orcamento_fornecedores"("orcamentoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamento_fornecedores_orcamentoId_fkey'
  ) THEN
    ALTER TABLE "orcamento_fornecedores"
      ADD CONSTRAINT "orcamento_fornecedores_orcamentoId_fkey"
      FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "orcamento_itens" (
  "id" TEXT NOT NULL,
  "orcamentoId" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "data" TIMESTAMP(3),
  "ordem" INTEGER NOT NULL,
  "isDestaque" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "orcamento_itens_orcamentoId_idx"
  ON "orcamento_itens"("orcamentoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamento_itens_orcamentoId_fkey'
  ) THEN
    ALTER TABLE "orcamento_itens"
      ADD CONSTRAINT "orcamento_itens_orcamentoId_fkey"
      FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "orcamento_item_precos" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "fornecedorId" TEXT NOT NULL,
  "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT "orcamento_item_precos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "orcamento_item_precos_itemId_fornecedorId_key"
  ON "orcamento_item_precos"("itemId", "fornecedorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamento_item_precos_itemId_fkey'
  ) THEN
    ALTER TABLE "orcamento_item_precos"
      ADD CONSTRAINT "orcamento_item_precos_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "orcamento_itens"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamento_item_precos_fornecedorId_fkey'
  ) THEN
    ALTER TABLE "orcamento_item_precos"
      ADD CONSTRAINT "orcamento_item_precos_fornecedorId_fkey"
      FOREIGN KEY ("fornecedorId") REFERENCES "orcamento_fornecedores"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
