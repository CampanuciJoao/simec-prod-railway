import prisma from '../../prismaService.js';
import { getAgora } from '../../timeService.js';
import { buscarSegurosAtivosPorTenant } from './seguroAlertRepository.js';
import { gerarAlertaVencimentoSeguro } from './seguroAlertRules.js';

async function processarTenant(tenant, agoraUtc) {
  const timezone = tenant.timezone || 'America/Campo_Grande';

  const segurosAtivos = await buscarSegurosAtivosPorTenant(tenant.id);

  let total = 0;

  for (const seguro of segurosAtivos) {
    total += await gerarAlertaVencimentoSeguro(
      tenant.id,
      seguro,
      agoraUtc,
      timezone
    );
  }

  console.log(`[ALERTA_SEGURO][${tenant.id}] Total=${total} | tz=${timezone}`);

  return total;
}

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

  for (const tenant of tenants) {
    totalGlobal += await processarTenant(tenant, agoraUtc);
  }

  console.log(`[ALERTA_SEGURO] TOTAL GLOBAL: ${totalGlobal}`);

  return totalGlobal;
}

export default gerarAlertasSeguro;