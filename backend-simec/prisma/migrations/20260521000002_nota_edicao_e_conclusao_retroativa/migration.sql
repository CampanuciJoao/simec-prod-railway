-- Edição rastreável de notas de andamento + conclusão retroativa de OS.
--
-- 1. Notas: colunas editado_em / editado_por_id para sinalizar que o
--    admin corrigiu a nota. Detalhe da edição (campos antes/depois)
--    fica no log_auditoria.
-- 2. OS Corretiva: data_hora_fim_evento espelha data_hora_inicio_evento
--    da abertura — permite registrar a hora real em que o problema foi
--    resolvido quando difere da hora de conclusão no sistema (caso
--    típico: OS aberta retroativamente e concluída horas depois).

ALTER TABLE "notas_andamento"
  ADD COLUMN "editado_em"       TIMESTAMP(3),
  ADD COLUMN "editado_por_id"   TEXT;

ALTER TABLE "notas_andamento"
  ADD CONSTRAINT "notas_andamento_editado_por_id_fkey"
  FOREIGN KEY ("editado_por_id")
  REFERENCES "usuarios"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "os_corretivas"
  ADD COLUMN "data_hora_fim_evento" TIMESTAMP(3);
