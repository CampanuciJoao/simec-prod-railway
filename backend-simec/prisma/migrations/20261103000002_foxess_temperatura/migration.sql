-- Adiciona temperaturas no snapshot FoxESS. Inversor/ambiente altos
-- sao sinal de estresse termico (ventilacao do rack, local sem ar
-- condicionado, filtro sujo).

ALTER TABLE "foxess_snapshots"
  ADD COLUMN "ambient_temp_c"  DOUBLE PRECISION,
  ADD COLUMN "inverter_temp_c" DOUBLE PRECISION;
