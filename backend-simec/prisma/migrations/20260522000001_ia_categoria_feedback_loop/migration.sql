-- Feedback supervisionado da IA: correções de categoria.
--
-- Dois modelos colaborando:
--   - ia_categoria_labels (TENANT-SCOPED): auditoria de quem corrigiu o quê.
--   - ia_categoria_licoes (CROSS-TENANT, sem tenantId): lição técnica
--     despersonalizada derivada da label. É o ativo coletivo do produto —
--     cliente novo se beneficia das correções dos anteriores via few-shot
--     no prompt do LLM, sem nunca ver dado de outro tenant.

CREATE TABLE "ia_categoria_licoes" (
    "id" TEXT NOT NULL,
    "texto_despersonalizado" TEXT NOT NULL,
    "categoria_correta" TEXT NOT NULL,
    "service_type_code" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "vezes_aplicada" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ia_categoria_licoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ia_categoria_licoes_ativa_categoria_correta_idx"
    ON "ia_categoria_licoes"("ativa", "categoria_correta");
CREATE INDEX "ia_categoria_licoes_ativa_service_type_code_idx"
    ON "ia_categoria_licoes"("ativa", "service_type_code");

CREATE TABLE "ia_categoria_labels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pdf_extraido_id" TEXT NOT NULL,
    "categoria_original" TEXT,
    "categoria_correta" TEXT NOT NULL,
    "comentario" TEXT,
    "autor_id" TEXT,
    "licao_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ia_categoria_labels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ia_categoria_labels_tenantId_created_at_idx"
    ON "ia_categoria_labels"("tenantId", "created_at" DESC);
CREATE INDEX "ia_categoria_labels_pdf_extraido_id_idx"
    ON "ia_categoria_labels"("pdf_extraido_id");

ALTER TABLE "ia_categoria_labels"
    ADD CONSTRAINT "ia_categoria_labels_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ia_categoria_labels"
    ADD CONSTRAINT "ia_categoria_labels_pdf_extraido_id_fkey"
    FOREIGN KEY ("pdf_extraido_id") REFERENCES "gehc_pdf_extraidos"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ia_categoria_labels"
    ADD CONSTRAINT "ia_categoria_labels_autor_id_fkey"
    FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ia_categoria_labels"
    ADD CONSTRAINT "ia_categoria_labels_licao_id_fkey"
    FOREIGN KEY ("licao_id") REFERENCES "ia_categoria_licoes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
