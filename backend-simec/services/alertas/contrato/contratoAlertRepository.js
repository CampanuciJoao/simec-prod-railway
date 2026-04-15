import prisma from '../../prismaService.js';

/**
 * 🔍 BUSCA
 */
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

/**
 * 🔥 UPSERT INTELIGENTE (PADRÃO DO SISTEMA)
 */
export async function upsertAlertaContrato(tenantId, alertaId, data) {
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

  /**
   * 🟢 NÃO EXISTE → CRIA
   */
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

  /**
   * 🔍 VERIFICA SE MUDOU
   */
  const mudou =
    existente.titulo !== data.titulo ||
    existente.subtitulo !== data.subtitulo ||
    existente.prioridade !== data.prioridade ||
    String(existente.data) !== String(data.data) ||
    JSON.stringify(existente.metadata || {}) !==
      JSON.stringify(data.metadata || {});

  /**
   * ⚪ NÃO MUDOU → IGNORA
   */
  if (!mudou) {
    return { created: false, updated: false };
  }

  /**
   * 🟡 MUDOU → ATUALIZA
   */
  await prisma.alerta.update({
    where: { id: alertaId },
    data: {
      tenantId,
      ...data,
    },
  });

  return { created: false, updated: true };
}