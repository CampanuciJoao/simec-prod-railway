import prisma from '../../prismaService.js';
import { getAgora } from '../../time/index.js';
import { buscarVisitasVencidasPorTenant } from './osCorretivaAlertRepository.js';
import {
  gerarAlertasVisitaInicioProximo,
  gerarAlertasVisitaFimProximo,
  gerarAlertaVisitaVencida,
} from './osCorretivaAlertRules.js';

async function processarTenant(tenant, agora) {
  const [inicioTotal, fimTotal, visitas] = await Promise.all([
    gerarAlertasVisitaInicioProximo(tenant.id, agora),
    gerarAlertasVisitaFimProximo(tenant.id, agora),
    buscarVisitasVencidasPorTenant(tenant.id, agora),
  ]);

  const vencidaResults = await Promise.all(
    visitas.map((v) => gerarAlertaVisitaVencida(tenant.id, v))
  );
  const vencidaTotal = vencidaResults.reduce((acc, v) => acc + v, 0);

  const total = inicioTotal + fimTotal + vencidaTotal;

  console.log(
    `[ALERTA_OS_CORRETIVA][${tenant.id}] inicio_proximo=${inicioTotal} fim_proximo=${fimTotal} vencidas=${vencidaTotal}`
  );

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
