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
      editadoPor: { select: { nome: true } },
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

// Status considerados "aguardando ação" — usados pelo pseudo-status que
// alimenta o card "Aguardando" na lista de manutenções.
export const OS_CORRETIVA_STATUS_AGUARDANDO = ['Aberta', 'EmAndamento', 'AguardandoTerceiro'];

// Status considerados "em andamento" para a aba Ocorrências (que filtra
// tipo='Ocorrencia' e portanto nunca tem AguardandoTerceiro).
export const OS_CORRETIVA_STATUS_EM_ANDAMENTO = ['Aberta', 'EmAndamento'];

function expandirFiltroStatusOsCorretiva(status) {
  if (!status) return null;
  if (status === 'aguardando') {
    return { in: OS_CORRETIVA_STATUS_AGUARDANDO };
  }
  if (status === 'em_andamento') {
    return { in: OS_CORRETIVA_STATUS_EM_ANDAMENTO };
  }
  return status;
}

export async function listarOsCorretivas({ tenantId, equipamentoId, status, tipo, search, page, pageSize }) {
  const where = { tenantId };

  if (equipamentoId) where.equipamentoId = equipamentoId;
  const statusFiltro = expandirFiltroStatusOsCorretiva(status);
  if (statusFiltro !== null) where.status = statusFiltro;
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
        autor: { select: { nome: true } },
        visitas: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { notas: true, visitas: true } },
      },
      orderBy: { dataHoraAbertura: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.osCorretiva.count({ where }),
  ]);

  // Métricas refletem o panorama do tenant ignorando o filtro de status,
  // mantendo os cards de KPI consistentes mesmo com um status aplicado.
  const { status: _statusIgnoradoOs, ...whereParaMetricasOs } = where;
  const [metricas, totalSemStatus] = await Promise.all([
    prisma.osCorretiva.groupBy({
      by: ['status'],
      where: whereParaMetricasOs,
      _count: { id: true },
    }),
    prisma.osCorretiva.count({ where: whereParaMetricasOs }),
  ]);

  const metricasMap = { Aberta: 0, EmAndamento: 0, AguardandoTerceiro: 0, Concluida: 0, Cancelada: 0 };
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
      total: totalSemStatus,
      abertas: metricasMap.Aberta,
      emAndamento: metricasMap.EmAndamento,
      aguardandoTerceiro: metricasMap.AguardandoTerceiro,
      concluidas: metricasMap.Concluida,
      canceladas: metricasMap.Cancelada,
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

export async function listarOsAbertasPorEquipamento({ tenantId, equipamentoId }) {
  return prisma.osCorretiva.findMany({
    where: {
      tenantId,
      equipamentoId,
      status: { in: ['Aberta', 'EmAndamento', 'AguardandoTerceiro'] },
    },
    select: {
      id: true,
      numeroOS: true,
      status: true,
      tipo: true,
      descricaoProblema: true,
      dataHoraAbertura: true,
    },
    orderBy: { dataHoraAbertura: 'asc' },
  });
}

export async function buscarConflitoVisitaPorEquipamento({ tenantId, equipamentoId, inicioUtc, fimUtc, ignorarVisitaId = null }) {
  const where = {
    tenantId,
    status: { in: ['Agendada', 'EmExecucao'] },
    osCorretiva: { equipamentoId },
    dataHoraInicioPrevista: { lt: fimUtc },
    dataHoraFimPrevista: { gt: inicioUtc },
  };
  if (ignorarVisitaId) where.id = { not: ignorarVisitaId };

  return prisma.visitaTerceiro.findFirst({
    where,
    select: {
      id: true,
      prestadorNome: true,
      dataHoraInicioPrevista: true,
      dataHoraFimPrevista: true,
      osCorretiva: { select: { numeroOS: true } },
    },
  });
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
  if (autorId) {
    const usuario = await prisma.usuario.findFirst({ where: { tenantId, id: autorId }, select: { id: true } });
    if (!usuario) throw new Error('Usuário não encontrado no tenant.');
  }

  return prisma.notaAndamento.create({
    data: {
      tenant: { connect: { id: tenantId } },
      nota,
      origem: 'manual',
      osCorretiva: { connect: { tenantId_id: { tenantId, id: osId } } },
      tecnicoNome,
      ...(autorId ? { autor: { connect: { id: autorId } } } : {}),
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

export async function contarVisitasEmExecucaoOuAgendadas({ tenantId, osId }) {
  return prisma.visitaTerceiro.count({
    where: { tenantId, osCorretivaId: osId, status: { in: ['Agendada', 'EmExecucao'] } },
  });
}
