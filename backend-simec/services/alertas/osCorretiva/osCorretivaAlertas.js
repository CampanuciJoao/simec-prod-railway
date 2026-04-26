import prisma from '../../prismaService.js';
import { getAgora } from '../../timeService.js';
import { buscarVisitasVencidasPorTenant } from './osCorretivaAlertRepository.js';
import { gerarAlertaVisitaVencida } from './osCorretivaAlertRules.js';

async function processarTenant(tenant, agora) {
  const visitas = await buscarVisitasVencidasPorTenant(tenant.id, agora);

  const results = await Promise.all(
    visitas.map((visita) => gerarAlertaVisitaVencida(tenant.id, visita))
  );

  const total = results.reduce((acc, val) => acc + val, 0);

  console.log(`[ALERTA_OS_CORRETIVA][${tenant.id}] visitas vencidas=${total}`);

  return { total, afetou: total > 0 };
}

export async function gerarAlertasOsCorretiva() {
  const agora = getAgora();

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  let totalGlobal = 0;
  const tenantsAfetados = [];

  const results = await Promise.all(
    tenants.map((tenant) =>
      processarTenant(tenant, agora).then((res) => ({ tenantId: tenant.id, ...res }))
    )
  );

  for (const result of results) {
    totalGlobal += result.total;
    if (result.afetou) tenantsAfetados.push(result.tenantId);
  }

  console.log(
    `[ALERTA_OS_CORRETIVA] TOTAL GLOBAL: ${totalGlobal} | tenantsAfetados=${tenantsAfetados.length}`
  );

  return { total: totalGlobal, tenantsAfetados };
}

export default gerarAlertasOsCorretiva;
