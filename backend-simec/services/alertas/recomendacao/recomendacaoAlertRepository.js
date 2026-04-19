import prisma from '../../prismaService.js';

function alertaMudou(existente, data) {
  return (
    existente.titulo !== data.titulo ||
    existente.subtitulo !== data.subtitulo ||
    existente.subtituloBase !== data.subtituloBase ||
    existente.numeroOS !== data.numeroOS ||
    String(existente.dataHoraAgendamentoInicio) !==
      String(data.dataHoraAgendamentoInicio) ||
    String(existente.dataHoraAgendamentoFim) !==
      String(data.dataHoraAgendamentoFim) ||
    existente.prioridade !== data.prioridade ||
    String(existente.data) !== String(data.data) ||
    existente.tipo !== data.tipo ||
    existente.tipoCategoria !== data.tipoCategoria ||
    existente.tipoEvento !== data.tipoEvento ||
    existente.link !== data.link
  );
}

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
      subtituloBase: true,
      numeroOS: true,
      dataHoraAgendamentoInicio: true,
      dataHoraAgendamentoFim: true,
      prioridade: true,
      data: true,
      tipo: true,
      tipoCategoria: true,
      tipoEvento: true,
      link: true,
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

  if (!alertaMudou(existente, data)) {
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
