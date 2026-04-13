import prisma from '../../prismaService.js';

export async function buscarManutencoesAgendadasFuturas(tenantId, agora) {
  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraAgendamentoInicio: { gt: agora },
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoInicio: 'asc',
    },
  });
}

export async function buscarManutencoesParaInicioAutomatico(tenantId, agora) {
  const margemInicio = new Date(agora.getTime() + 60000);

  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraAgendamentoInicio: { lte: margemInicio },
      dataHoraAgendamentoFim: {
        not: null,
        gt: agora,
      },
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
  });
}

export async function buscarManutencoesComFimProximo(tenantId, agora) {
  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: { in: ['Agendada', 'EmAndamento'] },
      dataHoraAgendamentoFim: {
        not: null,
        gt: agora,
      },
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoFim: 'asc',
    },
  });
}

export async function buscarManutencoesParaConfirmacao(tenantId, agora) {
  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: { in: ['Agendada', 'EmAndamento'] },
      dataHoraAgendamentoFim: {
        not: null,
        lte: agora,
      },
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoFim: 'asc',
    },
  });
}

export async function existeAlerta(tenantId, id) {
  const alerta = await prisma.alerta.findFirst({
    where: {
      id,
      tenantId,
    },
    select: { id: true },
  });

  return !!alerta;
}

export async function criarAlertaSeNaoExistir(tenantId, payload) {
  const jaExiste = await existeAlerta(tenantId, payload.id);
  if (jaExiste) return false;

  await prisma.alerta.create({
    data: {
      ...payload,
      tenantId,
    },
  });

  return true;
}

export async function iniciarManutencaoAutomaticamente(tenantId, manut, agora, alertaPayload) {
  await prisma.$transaction(async (tx) => {
    await tx.equipamento.update({
      where: { id: manut.equipamentoId },
      data: { status: 'EmManutencao' },
    });

    await tx.manutencao.update({
      where: { id: manut.id },
      data: {
        status: 'EmAndamento',
        dataInicioReal: manut.dataInicioReal || manut.dataHoraAgendamentoInicio,
      },
    });

    await tx.alerta.upsert({
      where: { id: alertaPayload.id },
      update: {
        tenantId,
        ...alertaPayload,
        data: agora,
      },
      create: {
        tenantId,
        ...alertaPayload,
        data: agora,
      },
    });
  });
}

export async function moverManutencaoParaAguardandoConfirmacao(tenantId, manut, agora, alertaPayload) {
  await prisma.$transaction(async (tx) => {
    await tx.manutencao.update({
      where: { id: manut.id },
      data: {
        status: 'AguardandoConfirmacao',
      },
    });

    await tx.equipamento.update({
      where: { id: manut.equipamentoId },
      data: {
        status: 'EmManutencao',
      },
    });

    await tx.alerta.upsert({
      where: { id: alertaPayload.id },
      update: {
        tenantId,
        ...alertaPayload,
        data: agora,
      },
      create: {
        tenantId,
        ...alertaPayload,
        data: agora,
      },
    });
  });
}