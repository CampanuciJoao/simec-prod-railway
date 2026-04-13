import prisma from '../../prismaService.js';
import { startOfDay } from 'date-fns';
import { getAgora } from '../../timeService.js';
import { buscarContratosAtivosPorTenant } from './contratoAlertRepository.js';
import { gerarAlertaVencimentoContrato } from './contratoAlertRules.js';

async function processarTenant(tenantId, hoje) {
  const contratosAtivos = await buscarContratosAtivosPorTenant(tenantId);

  let total = 0;

  for (const contrato of contratosAtivos) {
    total += await gerarAlertaVencimentoContrato(tenantId, contrato, hoje);
  }

  console.log(`[ALERTA_CONTRATO][${tenantId}] Total=${total}`);

  return total;
}

export async function gerarAlertasContrato() {
  const hoje = startOfDay(getAgora());

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  let totalGlobal = 0;

  for (const tenant of tenants) {
    totalGlobal += await processarTenant(tenant.id, hoje);
  }

  console.log(`[ALERTA_CONTRATO] TOTAL GLOBAL: ${totalGlobal}`);

  return totalGlobal;
}