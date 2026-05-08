-- Adiciona systemId do portal GE para uso nas queries equipmentHealth e assetConnectivity
ALTER TABLE "equipamentos" ADD COLUMN IF NOT EXISTS "gehc_system_id" TEXT;
