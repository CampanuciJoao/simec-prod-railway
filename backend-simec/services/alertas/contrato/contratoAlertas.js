import prisma from '../../prismaService.js';
import { getAgora } from '../../timeService.js';
import { buscarContratosAtivosPorTenant } from './contratoAlertRepository.js';
import { gerarAlertaVencimentoContrato } from './contratoAlertRules.js';

async function processarTenant(tenant, agoraUtc) {
  const timezone = tenant.timezone || 'America/Campo_Grande';

  const contratos = await buscarContratosAtivosPorTenant(tenant.id);

  let total = 0;

  for (const contrato of contratos) {
    total += await gerarAlertaVencimentoContrato(
      tenant.id,
      contrato,
      agoraUtc,
      timezone
    );
  }

  console.log(`[ALERTA_CONTRATO][${tenant.id}] Total=${total} | tz=${timezone}`);

  return total;
}

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

  for (const tenant of tenants) {
    totalGlobal += await processarTenant(tenant, agoraUtc);
  }

  console.log(`[ALERTA_CONTRATO] TOTAL GLOBAL: ${totalGlobal}`);

  return totalGlobal;
}

export default gerarAlertasContrato;