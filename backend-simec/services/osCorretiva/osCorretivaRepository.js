import prisma from '../prismaService.js';

const INCLUDE_EQUIPAMENTO = {
  equipamento: {
    include: { unidade: true },
  },
};

const INCLUDE_NOTAS = (tenantId) => ({
  notas: {
    where: { tenantId },
    orderBy: { data: 'asc' },
    include: {
      autor: { select: { nome: true } },
    },
  },
});

const INCLUDE_VISITAS = {
  visitas: {
    orderBy: { createdAt: 'asc' },
  },
};

function includeCompleto(tenantId) {
  return {
    ...INCLUDE_EQUIPAMENTO,
    ...INCLUDE_NOTAS(tenantId),
    ...INCLUDE_VISITAS,
    autor: { select: { nome: true } },
  };
}

export async function buscarOsPorId({ tenantId, osId }) {
  return prisma.osCorretiva.findFirst({
    where: { tenantId, id: osId },
    include: includeCompleto(tenantId),
  });
}

export async function buscarOsResumo({ tenantId, osId }) {
  return prisma.osCorretiva.findFirst({
    where: { tenantId, id: osId },
    select: {
      id: true,
      tenantId: true,
      numeroOS: true,
      equipamentoId: true,
      status: true,
      tipo: true,
      statusEquipamentoAbertura: true,
      equipamento: {
        select: {
          status: true,
          unidade: { select: { timezone: true } },
        },
      },
    },
  });
}

export async function listarOsCorretivas({ tenantId, equipamentoId, status, tipo, search, page, pageSize }) {
  const where = { tenantId };

  if (equipamentoId) where.equipamentoId = equipamentoId;
  if (status) where.status = status;
  if (tipo) where.tipo = tipo;
  if (search) {
    where.OR = [
      { numeroOS: { contains: search, mode: 'insensitive' } },
      { solicitante: { contains: search, mode: 'insensitive' } },
      { descricaoProblema: { contains: search, mode: 'insensitive' } },
      { equipamento: { modelo: { contains: search, mode: 'insensitive' } } },
      { equipamento: { tag: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.osCorretiva.findMany({
      where,
      include: {
        ...INCLUDE_EQUIPAMENTO,
        visitas: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { notas: true, visitas: true } },
      },
      orderBy: { dataHoraAbertura: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.osCorretiva.count({ where }),
  ]);

  const metricas = await prisma.osCorretiva.groupBy({
    by: ['status'],
    where: { tenantId },
    _count: { id: true },
  });

  const metricasMap = { Aberta: 0, EmAndamento: 0, AguardandoTerceiro: 0, Concluida: 0 };
  for (const m of metricas) {
    metricasMap[m.status] = m._count.id;
  }

  return {
    items,
    total,
    page,
    pageSize,
    hasNextPage: total > page * pageSize,
    metricas: {
      total,
      abertas: metricasMap.Aberta,
      emAndamento: metricasMap.EmAndamento,
      aguardandoTerceiro: metricasMap.AguardandoTerceiro,
      concluidas: metricasMap.Concluida,
    },
  };
}

export async function existeOsAbertaParaEquipamento({ tenantId, equipamentoId, ignorarOsId = null }) {
  const where = {
    tenantId,
    equipamentoId,
    status: { in: ['Aberta', 'EmAndamento', 'AguardandoTerceiro'] },
  };
  if (ignorarOsId) where.id = { not: ignorarOsId };

  return prisma.osCorretiva.findFirst({ where, select: { id: true, numeroOS: true } });
}

export async function contarOsDoTenant(tenantId) {
  return prisma.osCorretiva.count({ where: { tenantId } });
}

export async function criarOsCorretiva(data) {
  return prisma.osCorretiva.create({ data });
}

export async function atualizarOsCorretiva({ tenantId, osId, data }) {
  return prisma.osCorretiva.update({
    where: { tenantId_id: { tenantId, id: osId } },
    data,
  });
}

export async function criarNotaOsCorretiva({ tenantId, osId, nota, autorId, tecnicoNome }) {
  return prisma.notaAndamento.create({
    data: {
      tenant: { connect: { id: tenantId } },
      nota,
      origem: 'manual',
      osCorretiva: { connect: { tenantId_id: { tenantId, id: osId } } },
      tecnicoNome,
      ...(autorId ? { autor: { connect: { tenantId_id: { tenantId, id: autorId } } } } : {}),
    },
    include: { autor: { select: { nome: true } } },
  });
}

export async function criarVisitaTerceiro({ tenantId, osId, prestadorNome, dataHoraInicioPrevista, dataHoraFimPrevista }) {
  return prisma.visitaTerceiro.create({
    data: {
      tenant: { connect: { id: tenantId } },
      osCorretiva: { connect: { tenantId_id: { tenantId, id: osId } } },
      prestadorNome,
      dataHoraInicioPrevista: new Date(dataHoraInicioPrevista),
      dataHoraFimPrevista: new Date(dataHoraFimPrevista),
      status: 'Agendada',
    },
  });
}

export async function buscarVisitaPorId({ tenantId, visitaId }) {
  return prisma.visitaTerceiro.findFirst({
    where: { tenantId, id: visitaId },
    include: { osCorretiva: { select: { id: true, status: true, equipamentoId: true } } },
  });
}

export async function atualizarVisita({ tenantId, visitaId, data }) {
  return prisma.visitaTerceiro.update({
    where: { tenantId_id: { tenantId, id: visitaId } },
    data,
  });
}
