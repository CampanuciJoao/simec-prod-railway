import prisma from '../../prismaService.js';

export async function buscarVisitasVencidasPorTenant(tenantId, agora) {
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraFimPrevista: { lt: agora },
    },
    select: {
      id: true,
      osCorretivaId: true,
      prestadorNome: true,
      dataHoraFimPrevista: true,
      osCorretiva: {
        select: {
          id: true,
          numeroOS: true,
          equipamento: {
            select: { tag: true, nome: true },
          },
        },
      },
    },
  });
}

function alertaMudou(existente, data) {
  return (
    existente.titulo !== data.titulo ||
    existente.subtitulo !== data.subtitulo ||
    existente.prioridade !== data.prioridade ||
    existente.tipoEvento !== data.tipoEvento ||
    existente.link !== data.link
  );
}

export async function upsertAlertaOsCorretiva(tenantId, alertaId, data) {
  const existente = await prisma.alerta.findUnique({
    where: { id: alertaId },
    select: {
      titulo: true,
      subtitulo: true,
      prioridade: true,
      tipoEvento: true,
      link: true,
    },
  });

  if (!existente) {
    await prisma.alerta.create({ data: { tenantId, id: alertaId, ...data } });
    return { created: true, updated: false };
  }

  if (!alertaMudou(existente, data)) {
    return { created: false, updated: false };
  }

  await prisma.alerta.update({ where: { id: alertaId }, data: { tenantId, ...data } });
  return { created: false, updated: true };
}
