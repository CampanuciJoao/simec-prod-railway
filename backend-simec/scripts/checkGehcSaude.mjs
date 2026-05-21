// Diagnóstico do pipeline de captura de saúde GEHC. Read-only.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('[ultimos snapshots por equipamento]');
  const ultimos = await prisma.$queryRawUnsafe(`
    SELECT eq.apelido, eq.modelo, eq.tag,
           s.captured_at,
           s.helium_level_pct AS he,
           s.helium_pressure_psi AS psi,
           s.coolant_temp_c AS temp,
           s.compressor_status AS comp,
           s.equipment_online AS online
    FROM (
      SELECT DISTINCT ON (equipamento_id) *
      FROM gehc_saude_snapshots
      ORDER BY equipamento_id, captured_at DESC
    ) s
    JOIN equipamentos eq ON s.equipamento_id = eq.id
    ORDER BY s.captured_at DESC
  `);
  console.log(JSON.stringify(ultimos, null, 2));

  console.log('\n[contagem de snapshots por dia - ultimos 7 dias]');
  const porDia = await prisma.$queryRawUnsafe(`
    SELECT DATE(captured_at) AS dia, COUNT(*)::int AS total
    FROM gehc_saude_snapshots
    WHERE captured_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(captured_at)
    ORDER BY dia DESC
  `);
  console.log(JSON.stringify(porDia, null, 2));

  console.log('\n[gehcToken - estado da auth por tenant]');
  const tokens = await prisma.$queryRawUnsafe(`
    SELECT t.slug,
           gt.access_token IS NOT NULL AS tem_access,
           gt.id_token IS NOT NULL AS tem_id,
           gt.refresh_token IS NOT NULL AS tem_refresh,
           gt.expires_at,
           gt."updatedAt",
           gt.gehc_login IS NOT NULL AS tem_login
    FROM gehc_tokens gt
    JOIN tenants t ON gt."tenantId" = t.id
  `);
  console.log(JSON.stringify(tokens, null, 2));

  console.log('\n[ai_pipeline_estados - ultimas execucoes do gehc-monitorar-saude]');
  try {
    const pip = await prisma.$queryRawUnsafe(`
      SELECT t.slug, ape.pipeline, ape."ultimaExecucaoOk", ape."ultimaExecucaoMensagem",
             ape."ultimaExecucaoEm"
      FROM ai_pipeline_estados ape
      JOIN tenants t ON ape."tenantId" = t.id
      WHERE ape.pipeline LIKE '%gehc%' OR ape.pipeline LIKE '%saude%'
      ORDER BY ape."ultimaExecucaoEm" DESC NULLS LAST
      LIMIT 10
    `);
    console.log(JSON.stringify(pip, null, 2));
  } catch (e) {
    console.log('(tabela ou coluna pode ter outro nome)', e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
