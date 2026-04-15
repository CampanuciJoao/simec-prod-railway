import prisma from '../../prismaService.js';

export async function buscarEquipamentosComHistorico(tenantId, dataCorte) {
  return prisma.equipamento.findMany({
    where: {
      tenantId,
    },
    include: {
      unidade: true,
      ocorrencias: {
        where: {
          tenantId,
          data: {
            gte: dataCorte,
          },
        },
        orderBy: {
          data: 'desc',
        },
      },
      manutencoes: {
        where: {
          tenantId,
          OR: [
            {
              dataHoraAgendamentoInicio: {
                gte: dataCorte,
              },
            },
            {
              dataConclusao: {
                gte: dataCorte,
              },
            },
          ],
        },
        orderBy: {
          dataHoraAgendamentoInicio: 'desc',
        },
      },
    },
  });
}

export async function upsertAlertaRecomendacao(tenantId, alertaId, data) {
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

  const mudou =
    existente.titulo !== data.titulo ||
    existente.subtitulo !== data.subtitulo ||
    existente.prioridade !== data.prioridade ||
    String(existente.data) !== String(data.data) ||
    JSON.stringify(existente.metadata || {}) !==
      JSON.stringify(data.metadata || {});

  if (!mudou) {
    return { created: false, updated: false };
  }

  await prisma.alerta.update({
    where: { id: alertaId },
    data: {
      tenantId,
      ...data,
    },
  });

  return { created: false, updated: true };
}