-- Timeline completa de activities da OS GE (engenheiro remoto, escalacao,
-- follow-ups). Antes só salvávamos a ultima activity em corrective_action;
-- as intermediarias (com contexto rico de diagnostico parcial e contatos)
-- eram jogadas fora. Agora persistimos a lista completa em JSONB.

ALTER TABLE "gehc_ordens_servico"
  ADD COLUMN "activities_json" JSONB;
