import prisma from '../../prismaService.js';
import { startOfDay } from 'date-fns';
import { getAgora } from '../../timeService.js';
import { buscarSegurosAtivosPorTenant } from './seguroAlertRepository.js';
import { gerarAlertaVencimentoSeguro } from './seguroAlertRules.js';

async function processarTenant(tenantId, hoje) {
  const segurosAtivos = await buscarSegurosAtivosPorTenant(tenantId);

  let total = 0;

  for (const seguro of segurosAtivos) {
    total += await gerarAlertaVencimentoSeguro(tenantId, seguro, hoje);
  }

  console.log(`[ALERTA_SEGURO][${tenantId}] Total=${total}`);

  return total;
}

export async function gerarAlertasSeguro() {
  const hoje = startOfDay(getAgora());

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  let totalGlobal = 0;

  for (const tenant of tenants) {
    totalGlobal += await processarTenant(tenant.id, hoje);
  }

  console.log(`[ALERTA_SEGURO] TOTAL GLOBAL: ${totalGlobal}`);

  return totalGlobal;
}