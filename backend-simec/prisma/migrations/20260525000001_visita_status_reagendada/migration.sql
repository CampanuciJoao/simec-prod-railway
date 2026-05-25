-- Adiciona o valor 'Reagendada' ao enum StatusVisitaTerceiro. Usado
-- para marcar a visita antiga apos o admin remarcar com novas datas
-- (e opcionalmente novo prestador) sem cancelar a OS inteira. Distingue
-- semanticamente de 'PrazoEstendido' (que eh resultado de visita
-- EmExecucao) e 'Cancelada' (que nao existe — antes so dava pra cancelar
-- a OS toda).

ALTER TYPE "StatusVisitaTerceiro" ADD VALUE 'Reagendada';
