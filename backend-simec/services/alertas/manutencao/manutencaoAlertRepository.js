// Ficheiro: services/alertas/manutencao/manutencaoAlertRepository.js

import prisma from '../../prismaService.js';

/**
 * 🔍 BUSCAS (mantidas)
 */

export async function buscarManutencoesAgendadasFuturas(tenantId, agora) {
  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraAgendamentoInicio: { gt: agora },
    },
    include: {
      equipamento: { include: { unidade: true } },
    },
    orderBy: { dataHoraAgendamentoInicio: 'asc' },
  });
}

export async function buscarManutencoesParaInicioAutomatico(tenantId, agora) {
  const margemInicio = new Date(agora.getTime() + 60000);

  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraAgendamentoInicio: { lte: margemInicio },
      dataHoraAgendamentoFim: { not: null, gt: agora },
    },
    include: {
      equipamento: { include: { unidade: true } },
    },
  });
}

export async function buscarManutencoesComFimProximo(tenantId, agora) {
  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: { in: ['Agendada', 'EmAndamento'] },
      dataHoraAgendamentoFim: { not: null, gt: agora },
    },
    include: {
      equipamento: { include: { unidade: true } },
    },
    orderBy: { dataHoraAgendamentoFim: 'asc' },
  });
}

export async function buscarManutencoesParaConfirmacao(tenantId, agora) {
  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: { in: ['Agendada', 'EmAndamento'] },
      dataHoraAgendamentoFim: { not: null, lte: agora },
    },
    include: {
      equipamento: { include: { unidade: true } },
    },
    orderBy: { dataHoraAgendamentoFim: 'asc' },
  });
}

/**
 * 🔥 UPSERT PADRÃO (IGUAL SEGURO)
 */
export async function upsertAlertaManutencao(tenantId, alertaId, data) {
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

/**
 * 🔄 AÇÕES DE NEGÓCIO (SEM ALERTA)
 */
export async function atualizarStatusParaEmAndamento(
  tenantId,
  manut,
  agora
) {
  await prisma.$transaction(async (tx) => {
    await tx.equipamento.update({
      where: {
        tenantId_id: {
          tenantId,
          id: manut.equipamentoId,
        },
      },
      data: {
        status: 'EmManutencao',
      },
    });

    await tx.manutencao.update({
      where: {
        tenantId_id: {
          tenantId,
          id: manut.id,
        },
      },
      data: {
        status: 'EmAndamento',
        dataInicioReal:
          manut.dataInicioReal ||
          manut.dataHoraAgendamentoInicio,
      },
    });
  });
}

export async function moverParaAguardandoConfirmacao(
  tenantId,
  manut
) {
  await prisma.$transaction(async (tx) => {
    await tx.manutencao.update({
      where: {
        tenantId_id: {
          tenantId,
          id: manut.id,
        },
      },
      data: {
        status: 'AguardandoConfirmacao',
      },
    });

    await tx.equipamento.update({
      where: {
        tenantId_id: {
          tenantId,
          id: manut.equipamentoId,
        },
      },
      data: {
        status: 'EmManutencao',
      },
    });
  });
}