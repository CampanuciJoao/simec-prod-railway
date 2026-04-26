import prisma from '../../prismaService.js';
import { getAgora } from '../../time/index.js';

import { buscarContratosAtivosPorTenant } from './contratoAlertRepository.js';
import { gerarAlertaVencimentoContrato } from './contratoAlertRules.js';

/**
 * 🔧 Processa um tenant
 */
async function processarTenant(tenant, agoraUtc) {
  const timezone = tenant.timezone || 'America/Campo_Grande';

  const contratos = await buscarContratosAtivosPorTenant(tenant.id);

  // 🔥 paralelismo por contrato
  const results = await Promise.all(
    contratos.map((contrato) =>
      gerarAlertaVencimentoContrato(
        tenant.id,
        contrato,
        agoraUtc,
        timezone
      )
    )
  );

  const total = results.reduce((acc, val) => acc + val, 0);

  console.log(
    `[ALERTA_CONTRATO][${tenant.id}] Total=${total} | tz=${timezone}`
  );

  return {
    total,
    afetou: total > 0,
  };
}

/**
 * 🌍 Orquestrador global
 */
export async function gerarAlertasContrato() {
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

  // 🔥 paralelismo por tenant
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

  console.log(
    `[ALERTA_CONTRATO] TOTAL GLOBAL: ${totalGlobal} | tenantsAfetados=${tenantsAfetados.length}`
  );

  return {
    total: totalGlobal,
    tenantsAfetados,
  };
}

export default gerarAlertasContrato;