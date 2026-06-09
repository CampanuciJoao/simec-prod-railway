-- Adiciona valor 'ProblemaPersiste' em StatusVisitaTerceiro e
-- ResultadoVisita pra cobrir o cenario: visita aconteceu, manutencao
-- foi executada, mas o problema NAO ficou resolvido. Equipamento pode
-- estar operante com limitacao OU continuar inoperante, e nao ha
-- previsao de nova visita ainda.
--
-- Semantica completa dos status pos-visita:
--   Operante         — manutencao OK, equipamento liberado, OS encerra
--   PrazoEstendido   — manutencao em andamento, mais tempo necessario,
--                      nova visita ja agendada
--   NaoRealizada     — visita nao aconteceu (no-show); reagenda
--   Reagendada       — admin reagendou ANTES do prazo (pre-visita)
--   ProblemaPersiste — visita ocorreu, manutencao executada, problema
--                      continua; SEM nova data ainda. OS volta pra
--                      EmAndamento ate proxima visita ser agendada.

ALTER TYPE "StatusVisitaTerceiro" ADD VALUE IF NOT EXISTS 'ProblemaPersiste';
ALTER TYPE "ResultadoVisita" ADD VALUE IF NOT EXISTS 'ProblemaPersiste';
