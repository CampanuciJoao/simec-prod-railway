-- Persiste a confianca e o raciocinio do LLM ao categorizar a causa-raiz.
-- Antes esses campos eram retornados pelo extrator mas descartados na hora
-- de gravar — sem eles, o usuario nao tinha como entender por que uma OS
-- caiu numa categoria.

ALTER TABLE "gehc_pdf_extraidos"
  ADD COLUMN "llm_confianca"  DOUBLE PRECISION,
  ADD COLUMN "llm_raciocinio" TEXT;
