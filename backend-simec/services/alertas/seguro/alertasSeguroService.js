import prisma from '../../prismaService.js';
import { getAgora } from '../../timeService.js';
import { buscarSegurosAtivosPorTenant } from './seguroAlertRepository.js';
import { gerarAlertaVencimentoSeguro } from './seguroAlertRules.js';

/**
 * Processa um tenant
 */
async function processarTenant(tenant, agoraUtc) {
  const timezone = tenant.timezone || 'America/Campo_Grande';

  const segurosAtivos = await buscarSegurosAtivosPorTenant(tenant.id);

  let total = 0;

  // 🔥 roda em paralelo (melhor performance)
  const results = await Promise.all(
    segurosAtivos.map((seguro) =>
      gerarAlertaVencimentoSeguro(
        tenant.id,
        seguro,
        agoraUtc,
        timezone
      )
    )
  );

  total = results.reduce((acc, val) => acc + val, 0);

  console.log(
    `[ALERTA_SEGURO][${tenant.id}] Total=${total} | tz=${timezone}`
  );

  return {
    total,
    afetou: total > 0, // 🔥 importante
  };
}

/**
 * Orquestra todos os tenants
 */
export async function gerarAlertasSeguro() {
  const agoraUtc = getAgora();

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: {
      id: true,
      timezone: true,
    },
  });

  let totalGlobal = 0;
  const tenantsAfetados = [];

  // 🔥 roda tenants em paralelo também
  const results = await Promise.all(
    tenants.map((tenant) =>
      processarTenant(tenant, agoraUtc).then((res) => ({
        tenantId: tenant.id,
        ...res,
      }))
    )
  );

  for (const result of results) {
    totalGlobal += result.total;

    if (result.afetou) {
      tenantsAfetados.push(result.tenantId);
    }
  }

  console.log(`[ALERTA_SEGURO] TOTAL GLOBAL: ${totalGlobal}`);

  return {
    total: totalGlobal,
    tenantsAfetados,
  };
}

export default gerarAlertasSeguro;