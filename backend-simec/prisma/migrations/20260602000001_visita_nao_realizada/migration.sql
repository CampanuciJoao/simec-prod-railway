-- Adiciona valor 'NaoRealizada' em StatusVisitaTerceiro e ResultadoVisita
-- pra cobrir o cenario: visita chegou no prazo mas a manutencao nao
-- aconteceu (tecnico nao foi, peca atrasou, etc).
--
-- Diferenca semantica vs valores existentes:
--   PrazoEstendido — manutencao OCORREU mas equipamento ainda nao
--                    ficou operante; precisa de mais tempo
--   Reagendada     — admin reagendou ANTES do prazo (imprevisto pre-visita)
--   NaoRealizada   — passou do prazo mas a visita NAO aconteceu;
--                    precisa nova data, status do equipamento intacto

ALTER TYPE "StatusVisitaTerceiro" ADD VALUE IF NOT EXISTS 'NaoRealizada';
ALTER TYPE "ResultadoVisita" ADD VALUE IF NOT EXISTS 'NaoRealizada';
