import prisma from '../../prismaService.js';

export async function buscarSegurosAtivosPorTenant(tenantId) {
  return prisma.seguro.findMany({
    where: {
      tenantId,
      status: { in: ['Ativo', 'Vigente'] },
    },
  });
}

export async function upsertAlertaSeguro(tenantId, alertaId, data) {
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