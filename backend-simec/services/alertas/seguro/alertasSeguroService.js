import prisma from '../../prismaService.js';
import { getAgora } from '../../time/index.js';
import { buscarSegurosAtivosPorTenant, buscarConflitosCoberturaPorTenant } from './seguroAlertRepository.js';
import { gerarAlertaVencimentoSeguro, gerarAlertaConflitoCobertura } from './seguroAlertRules.js';

/**
 * Processa um tenant
 */
async function processarTenant(tenant, agoraUtc) {
  const timezone = tenant.timezone || 'America/Campo_Grande';

  const [segurosAtivos, conflitos] = await Promise.all([
    buscarSegurosAtivosPorTenant(tenant.id),
    buscarConflitosCoberturaPorTenant(tenant.id),
  ]);

  const [vencimentoResults, conflitoResults] = await Promise.all([
    Promise.all(
      segurosAtivos.map((seguro) =>
        gerarAlertaVencimentoSeguro(tenant.id, seguro, agoraUtc, timezone)
      )
    ),
    Promise.all(
      conflitos.map(([a, b]) => gerarAlertaConflitoCobertura(tenant.id, a, b))
    ),
  ]);

  const total =
    vencimentoResults.reduce((acc, val) => acc + val, 0) +
    conflitoResults.reduce((acc, val) => acc + val, 0);

  console.log(
    `[ALERTA_SEGURO][${tenant.id}] Total=${total} conflitos=${conflitos.length} | tz=${timezone}`
  );

  return {
    total,
    afetou: total > 0,
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