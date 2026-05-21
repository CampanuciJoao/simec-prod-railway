-- Adiciona campo logo_path em tenants para upload de logo customizado por
-- cliente. NULL = usa o logo SIMEC default em PDFs.

ALTER TABLE "tenants"
  ADD COLUMN "logo_path" TEXT;
