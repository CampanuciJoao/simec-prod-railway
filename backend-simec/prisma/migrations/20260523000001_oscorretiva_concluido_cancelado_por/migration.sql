-- Rastreio de quem concluiu / cancelou uma OS Corretiva. Antes a timeline
-- so mostrava "Registrado em DATA" sem identificar o usuario que tomou
-- a acao. Agora cada acao tem FK para o usuario, populado no service e
-- exibido na timeline ao lado da abertura ("Registrado por: ...").

ALTER TABLE "os_corretivas"
  ADD COLUMN "concluido_por_id" TEXT,
  ADD COLUMN "cancelado_por_id" TEXT;

ALTER TABLE "os_corretivas"
  ADD CONSTRAINT "os_corretivas_concluido_por_id_fkey"
  FOREIGN KEY ("concluido_por_id")
  REFERENCES "usuarios"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "os_corretivas"
  ADD CONSTRAINT "os_corretivas_cancelado_por_id_fkey"
  FOREIGN KEY ("cancelado_por_id")
  REFERENCES "usuarios"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
