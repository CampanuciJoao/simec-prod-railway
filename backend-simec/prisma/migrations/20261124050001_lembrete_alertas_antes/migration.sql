-- Avisos antecipados no lembrete: usuario escolhe quando receber alertas
-- adicionais antes do horario marcado (15min, 30min, 1h, 1 dia, etc.).
-- Reusa os mesmos canais do lembrete principal (nao duplica config).

ALTER TABLE "lembretes"
  ADD COLUMN "alertas_antes"     INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "avisos_disparados" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
