import prisma from '../../prismaService.js';

export async function buscarContratosAtivosPorTenant(tenantId) {
  return prisma.contrato.findMany({
    where: {
      tenantId,
      status: 'Ativo',
    },
    orderBy: {
      dataFim: 'asc',
    },
  });
}

export async function upsertAlertaContrato(tenantId, alertaId, data) {
  return prisma.alerta.upsert({
    where: { id: alertaId },
    update: {
      tenantId,
      ...data,
    },
    create: {
      tenantId,
      id: alertaId,
      ...data,
    },
  });
}