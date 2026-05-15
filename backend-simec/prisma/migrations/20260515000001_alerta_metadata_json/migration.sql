-- Adiciona coluna metadata_json em alertas para armazenar lista de
-- equipamentos relacionados (id + label + acao sugerida) usadas para
-- renderizar hyperlinks clicaveis no card. JSON serializado como TEXT.
-- Nullable e sem default - alertas antigos continuam funcionando sem
-- chips clicaveis (fallback para texto plano no subtitulo).

ALTER TABLE "alertas" ADD COLUMN "metadata_json" TEXT;
