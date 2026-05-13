-- Adiciona "data/hora real do evento" para OS Corretivas.
-- Permite backdating: o usuario informa quando o problema *aconteceu*, mesmo
-- que o registro no SIMEC seja posterior. KPIs operacionais (MTTR, MTBF)
-- passam a usar este campo em vez da data de criacao no sistema.
--
-- Manutencoes ja tem dataInicioReal/dataFimReal/dataConclusao com a mesma
-- semantica, entao nao precisam de novo campo.

ALTER TABLE "os_corretivas"
  ADD COLUMN "data_hora_inicio_evento" TIMESTAMP(3);
