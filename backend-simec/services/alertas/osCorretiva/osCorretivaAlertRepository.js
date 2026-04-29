import prisma from '../../prismaService.js';

const VISITA_SELECT = {
  id: true,
  osCorretivaId: true,
  prestadorNome: true,
  dataHoraInicioPrevista: true,
  dataHoraFimPrevista: true,
  osCorretiva: {
    select: {
      id: true,
      numeroOS: true,
      equipamento: { select: { tag: true, nome: true } },
    },
  },
};

export async function buscarVisitasComInicioProximo(tenantId, agora, horizonte) {
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraInicioPrevista: { gt: agora, lte: horizonte },
    },
    select: VISITA_SELECT,
  });
}

export async function buscarVisitasComFimProximo(tenantId, agora, horizonte) {
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraFimPrevista: { gt: agora, lte: horizonte },
    },
    select: VISITA_SELECT,
  });
}

export async function buscarVisitasVencidasPorTenant(tenantId, agora) {
  return prisma.visitaTerceiro.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraFimPrevista: { lt: agora },
    },
    select: VISITA_SELECT,
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
