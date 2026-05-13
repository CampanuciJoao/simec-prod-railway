-- Adiciona 'Vendido' ao enum StatusEquipamento.
-- Permite ao usuario registrar quando um equipamento foi vendido a terceiros
-- e parar todos os monitoramentos automaticos (GE, alertas, IA, manutencao).
--
-- O status 'Desativado' ja existia mas nao tinha lavra de logica nos workers.
-- Apos esse PR, ambos 'Vendido' e 'Desativado' fazem o sistema parar de
-- gerar alertas e processar telemetria do equipamento.
--
-- Diferenca conceitual:
--   Desativado: equipamento ainda do tenant, mas desinstalado / parado
--   Vendido:    equipamento saiu do tenant (registra comprador no historico)

ALTER TYPE "StatusEquipamento" ADD VALUE 'Vendido';
