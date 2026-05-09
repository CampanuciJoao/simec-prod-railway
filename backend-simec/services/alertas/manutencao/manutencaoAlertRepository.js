import prisma from '../../prismaService.js';
import { ALERT_CATEGORIAS } from '../alertTypes.js';

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

async function garantirStatusBaseDoEquipamento(tx, tenantId, manut) {
  const eventoExistente = await tx.manutencaoEvento.findFirst({
    where: {
      tenantId,
      manutencaoId: manut.id,
      tipo: 'STATUS_BASE_EQUIPAMENTO',
    },
    select: {
      id: true,
    },
  });

  if (eventoExistente) return;

  await tx.manutencaoEvento.create({
    data: {
      tenant: {
        connect: { id: tenantId },
      },
      manutencao: {
        connect: {
          tenantId_id: {
            tenantId,
            id: manut.id,
          },
        },
      },
      tipo: 'STATUS_BASE_EQUIPAMENTO',
      descricao: `Status base do equipamento registrado automaticamente para a OS ${manut.numeroOS}.`,
      metadataJson: JSON.stringify({
        statusAnterior: manut.equipamento?.status || null,
        origem: 'inicio_automatico',
      }),
    },
  });
}

const EQUIPAMENTO_SELECT = {
  select: {
    modelo: true,
    tag: true,
    status: true,
    unidade: { select: { nomeSistema: true } },
  },
};

export async function buscarManutencoesAgendadasFuturas(tenantId, agora) {
  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: 'Agendada',
      dataHoraAgendamentoInicio: { gt: agora },
    },
    include: { equipamento: EQUIPAMENTO_SELECT },
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
    include: { equipamento: EQUIPAMENTO_SELECT },
  });
}

export async function buscarManutencoesComFimProximo(tenantId, agora) {
  return prisma.manutencao.findMany({
    where: {
      tenantId,
      status: { in: ['Agendada', 'EmAndamento'] },
      dataHoraAgendamentoFim: { not: null, gt: agora },
    },
    include: { equipamento: EQUIPAMENTO_SELECT },
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
    include: { equipamento: EQUIPAMENTO_SELECT },
    orderBy: { dataHoraAgendamentoFim: 'asc' },
  });
}

export async function upsertAlertaManutencao(tenantId, alertaId, data) {
  const existente = await prisma.alerta.findFirst({
    where: { id: alertaId, tenantId },
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
    await prisma.alerta.create({ data: { tenantId, id: alertaId, ...data } });
    return { created: true, updated: false };
  }

  if (!alertaMudou(existente, data)) {
    return { created: false, updated: false };
  }

  await prisma.alerta.update({
    where: { id: alertaId },
    data: { tenantId, ...data },
  });

  return { created: false, updated: true };
}

const ALERTA_SELECT = {
  titulo: true, subtitulo: true, subtituloBase: true, numeroOS: true,
  dataHoraAgendamentoInicio: true, dataHoraAgendamentoFim: true,
  prioridade: true, data: true, tipo: true, tipoCategoria: true, tipoEvento: true, link: true,
};

export async function batchUpsertAlertasManutencao(tenantId, itens) {
  if (itens.length === 0) return 0;

  const ids = itens.map((i) => i.alertaId);
  const existentes = await prisma.alerta.findMany({
    where: { id: { in: ids }, tenantId },
    select: { id: true, ...ALERTA_SELECT },
  });
  const existentesMap = new Map(existentes.map((e) => [e.id, e]));

  const creates = [];
  const updates = [];

  for (const { alertaId, data } of itens) {
    const existente = existentesMap.get(alertaId);
    if (!existente) {
      creates.push({ tenantId, id: alertaId, ...data });
    } else if (alertaMudou(existente, data)) {
      updates.push({ id: alertaId, data: { tenantId, ...data } });
    }
  }

  await Promise.all([
    creates.length > 0
      ? prisma.alerta.createMany({ data: creates, skipDuplicates: true })
      : Promise.resolve(),
    updates.length > 0
      ? prisma.$transaction(updates.map((u) => prisma.alerta.update({ where: { id: u.id }, data: u.data })))
      : Promise.resolve(),
  ]);

  return creates.length + updates.length;
}

export async function removerAlertasManutencaoDaOS(
  tenantId,
  numeroOS
) {
  if (!tenantId || !numeroOS) return { count: 0 };

  return prisma.alerta.deleteMany({
    where: {
      tenantId,
      tipoCategoria: ALERT_CATEGORIAS.MANUTENCAO,
      numeroOS,
    },
  });
}

export async function atualizarStatusParaEmAndamento(
  tenantId,
  manut,
  agora
) {
  await prisma.$transaction(async (tx) => {
    await garantirStatusBaseDoEquipamento(tx, tenantId, manut);

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
