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
  // 🔥 busca alerta existente
  const existente = await prisma.alerta.findUnique({
    where: { id: alertaId },
    select: {
      titulo: true,
      subtitulo: true,
      prioridade: true,
      data: true,
      metadata: true,
    },
  });

  // 🔥 se não existe → cria
  if (!existente) {
    await prisma.alerta.create({
      data: {
        tenantId,
        id: alertaId,
        ...data,
      },
    });

    return { created: true, updated: false };
  }

  // 🔥 compara se mudou algo relevante
  const mudou =
    existente.titulo !== data.titulo ||
    existente.subtitulo !== data.subtitulo ||
    existente.prioridade !== data.prioridade ||
    String(existente.data) !== String(data.data) ||
    JSON.stringify(existente.metadata || {}) !==
      JSON.stringify(data.metadata || {});

  // 🔥 se não mudou → ignora
  if (!mudou) {
    return { created: false, updated: false };
  }

  // 🔥 atualiza
  await prisma.alerta.update({
    where: { id: alertaId },
    data: {
      tenantId,
      ...data,
    },
  });

  return { created: false, updated: true };
}