// Orquestrador de alertas de Controle de Qualidade.
// Pattern identico ao contratoAlertas.js.

import prisma from '../../prismaService.js';
import { getAgora } from '../../time/index.js';

import {
  buscarVencimentosAtivosPorTenant,
  removerAlertasOrfaos,
} from './controleQualidadeAlertRepository.js';
import { gerarAlertasParaVencimento } from './controleQualidadeAlertRules.js';

async function processarTenant(tenant, agoraUtc) {
  const timezone = tenant.timezone || 'UTC';

  const vencimentos = await buscarVencimentosAtivosPorTenant(tenant.id);

  let totalAlertasGerados = 0;
  const alertaIdsAtivos = [];

  for (const v of vencimentos) {
    const ids = await gerarAlertasParaVencimento(tenant.id, v, agoraUtc, timezone);
    alertaIdsAtivos.push(...ids);
    totalAlertasGerados += ids.length;
  }

  // Limpa alertas orfaos da categoria CQ deste tenant (testes deletados,
  // renovados, equipamentos desativados, etc).
  await removerAlertasOrfaos(tenant.id, alertaIdsAtivos);

  console.log(
    `[ALERTA_CQ][${tenant.id}] Vencimentos=${vencimentos.length} | Alertas=${totalAlertasGerados} | tz=${timezone}`
  );

  return {
    total: totalAlertasGerados,
    afetou: totalAlertasGerados > 0,
  };
}

export async function gerarAlertasControleQualidade() {
  const agoraUtc = getAgora();

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true, timezone: true },
  });

  let totalGlobal = 0;
  const tenantsAfetados = [];

  const results = await Promise.all(
    tenants.map((tenant) =>
      processarTenant(tenant, agoraUtc).then((res) => ({
        tenantId: tenant.id,
        ...res,
      }))
    )
  );

  for (const r of results) {
    totalGlobal += r.total;
    if (r.afetou) tenantsAfetados.push(r.tenantId);
  }

  console.log(
    `[ALERTA_CQ] TOTAL GLOBAL: ${totalGlobal} | tenantsAfetados=${tenantsAfetados.length}`
  );

  return { total: totalGlobal, tenantsAfetados };
}

export default gerarAlertasControleQualidade;
