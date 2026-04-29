import prisma from '../prismaService.js';
import {
  MANUTENCAO_STATUSS_CONFLITANTES,
  FAR_FUTURE_UTC_DATE,
  resolveOperationalTimezone,
} from '../time/index.js';

function getEquipamentoComUnidadeInclude() {
  return {
    equipamento: {
      include: {
        unidade: true,
      },
    },
  };
}

function getAnexosOrderBy() {
  return {
    anexos: {
      orderBy: {
        createdAt: 'desc',
      },
    },
  };
}

function getNotasAndamentoInclude(tenantId) {
  return {
    notasAndamento: {
      where: {
        tenantId,
      },
      orderBy: {
        data: 'desc',
      },
      include: {
        autor: {
          select: {
            nome: true,
          },
        },
      },
    },
  };
}

function getManutencaoDetalhesInclude(tenantId) {
  return {
    ...getEquipamentoComUnidadeInclude(),
    ...getAnexosOrderBy(),
    ...getNotasAndamentoInclude(tenantId),
  };
}

function getManutencaoBaseInclude() {
  return {
    ...getEquipamentoComUnidadeInclude(),
    ...getAnexosOrderBy(),
  };
}

function getManutencaoResumoSelect() {
  return {
    id: true,
    tenantId: true,
    numeroOS: true,
    equipamentoId: true,
    tipo: true,
    status: true,
    dataHoraAgendamentoInicio: true,
    dataHoraAgendamentoFim: true,
    dataInicioReal: true,
    dataConclusao: true,
    agendamentoDataInicioLocal: true,
    agendamentoHoraInicioLocal: true,
    agendamentoDataFimLocal: true,
    agendamentoHoraFimLocal: true,
    agendamentoTimezone: true,
    equipamento: {
      select: {
        status: true,
      },
    },
  };
}

export async function buscarTenantAtivo(tenantId) {
  return prisma.tenant.findFirst({
    where: {
      id: tenantId,
      ativo: true,
    },
    select: {
      id: true,
      timezone: true,
      locale: true,
    },
  });
}

export async function buscarEquipamentoDoTenant({
  tenantId,
  equipamentoId,
}) {
  return prisma.equipamento.findFirst({
    where: {
      id: equipamentoId,
      tenantId,
    },
    select: {
      id: true,
      tag: true,
      modelo: true,
      status: true,
      unidadeId: true,
      unidade: {
        select: {
          id: true,
          timezone: true,
          nomeSistema: true,
          nomeFantasia: true,
        },
      },
    },
  });
}

export async function buscarContextoOperacional({
  tenantId,
  equipamentoId,
}) {
  const [tenant, equipamento] = await Promise.all([
    buscarTenantAtivo(tenantId),
    buscarEquipamentoDoTenant({ tenantId, equipamentoId }),
  ]);

  if (!tenant) {
    return {
      ok: false,
      status: 403,
      message: 'Tenant não encontrado ou inativo.',
    };
  }

  if (!equipamento) {
    return {
      ok: false,
      status: 404,
      message: 'Equipamento não encontrado para este tenant.',
    };
  }

  const timezone = resolveOperationalTimezone({
    tenantTimezone: tenant.timezone,
    unidadeTimezone: equipamento.unidade?.timezone,
  });

  return {
    ok: true,
    tenant,
    equipamento,
    timezone,
  };
}

export async function buscarManutencaoPorId({
  tenantId,
  manutencaoId,
}) {
  return prisma.manutencao.findFirst({
    where: {
      id: manutencaoId,
      tenantId,
    },
    include: getManutencaoDetalhesInclude(tenantId),
  });
}

export async function buscarManutencaoResumo({
  tenantId,
  manutencaoId,
}) {
  return prisma.manutencao.findFirst({
    where: {
      id: manutencaoId,
      tenantId,
    },
    select: getManutencaoResumoSelect(),
  });
}

export async function listarManutencoes({
  tenantId,
  equipamentoId,
  unidadeId,
  tipo,
  status,
  search,
  page = 1,
  pageSize = 20,
  sortBy = 'dataHoraAgendamentoInicio',
  sortDirection = 'desc',
  incluirNotas = false,
}) {
  const whereClause = { tenantId };

  if (equipamentoId) {
    whereClause.equipamentoId = equipamentoId;
  }

  if (tipo) {
    whereClause.tipo = tipo;
  }

  if (status) {
    whereClause.status = status;
  }

  if (search) {
    whereClause.OR = [
      {
        numeroOS: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        descricaoProblemaServico: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        numeroChamado: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        tecnicoResponsavel: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        equipamento: {
          OR: [
            {
              modelo: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              tag: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              unidade: {
                nomeSistema: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        },
      },
    ];
  }

  if (unidadeId) {
    whereClause.equipamento = {
      tenantId,
      unidadeId,
    };
  }

  const orderBy =
    sortBy === 'unidade'
      ? {
          equipamento: {
            unidade: {
              nomeSistema: sortDirection === 'asc' ? 'asc' : 'desc',
            },
          },
        }
      : {
          [sortBy]: sortDirection === 'asc' ? 'asc' : 'desc',
        };

  const queryBase = {
    where: whereClause,
    include: incluirNotas
      ? getManutencaoDetalhesInclude(tenantId)
      : getManutencaoBaseInclude(),
    orderBy,
  };

  const skip = (page - 1) * pageSize;

  const [items, total, statusSummary] = await Promise.all([
    prisma.manutencao.findMany({
      ...queryBase,
      take: pageSize,
      skip,
    }),
    prisma.manutencao.count({
      where: whereClause,
    }),
    prisma.manutencao.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true,
      },
    }),
  ]);

  const metricas = statusSummary.reduce(
    (acc, item) => {
      acc.total = total;
      if (item.status === 'EmAndamento') acc.emAndamento = item._count.id;
      if (item.status === 'AguardandoConfirmacao') acc.aguardando = item._count.id;
      if (item.status === 'Concluida') acc.concluidas = item._count.id;
      if (item.status === 'Cancelada') acc.canceladas = item._count.id;
      return acc;
    },
    {
      total,
      emAndamento: 0,
      aguardando: 0,
      concluidas: 0,
      canceladas: 0,
    }
  );

  return {
    items,
    total,
    page,
    pageSize,
    hasNextPage: skip + items.length < total,
    metricas,
  };
}

export async function contarManutencoesDoTenant(tenantId) {
  return prisma.manutencao.count({
    where: {
      tenantId,
    },
  });
}

export async function existeConflitoAgendamento({
  tenantId,
  equipamentoId,
  startUtc,
  endUtc,
  manutencaoIdIgnorar = null,
}) {
  return prisma.manutencao.findFirst({
    where: {
      tenantId,
      equipamentoId,
      ...(manutencaoIdIgnorar
        ? {
            id: {
              not: manutencaoIdIgnorar,
            },
          }
        : {}),
      status: {
        in: MANUTENCAO_STATUSS_CONFLITANTES,
      },
      AND: [
        {
          dataHoraAgendamentoInicio: {
            lt: endUtc || FAR_FUTURE_UTC_DATE,
          },
        },
        {
          OR: [
            {
              dataHoraAgendamentoFim: {
                gt: startUtc,
              },
            },
            {
              dataHoraAgendamentoFim: null,
              dataHoraAgendamentoInicio: {
                lt: endUtc || FAR_FUTURE_UTC_DATE,
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      numeroOS: true,
      tipo: true,
      status: true,
      agendamentoDataInicioLocal: true,
      agendamentoHoraInicioLocal: true,
      agendamentoDataFimLocal: true,
      agendamentoHoraFimLocal: true,
    },
  });
}

export async function criarManutencao(payload) {
  return prisma.manutencao.create({
    data: payload,
    include: getManutencaoBaseInclude(),
  });
}

export async function atualizarManutencao({
  tenantId,
  manutencaoId,
  payload,
}) {
  return prisma.manutencao.update({
    where: {
      tenantId_id: {
        tenantId,
        id: manutencaoId,
      },
    },
    data: payload,
    include: getManutencaoDetalhesInclude(tenantId),
  });
}

export async function criarNotaAndamento({
  tenantId,
  usuarioId,
  manutencaoId,
  nota,
}) {
  return prisma.notaAndamento.create({
    data: {
      tenant: {
        connect: { id: tenantId },
      },
      nota,
      autor: {
        connect: {
          tenantId_id: {
            tenantId,
            id: usuarioId,
          },
        },
      },
      manutencao: {
        connect: {
          tenantId_id: {
            tenantId,
            id: manutencaoId,
          },
        },
      },
    },
    include: {
      autor: {
        select: {
          nome: true,
        },
      },
    },
  });
}

export async function registrarEventoManutencao({
  tenantId,
  manutencaoId,
  autorId = null,
  tipo,
  descricao = null,
  metadata = null,
}) {
  return prisma.manutencaoEvento.create({
    data: {
      tenant: {
        connect: { id: tenantId },
      },
      manutencao: {
        connect: {
          tenantId_id: {
            tenantId,
            id: manutencaoId,
          },
        },
      },
      ...(autorId
        ? {
            autor: {
              connect: {
                tenantId_id: {
                  tenantId,
                  id: autorId,
                },
              },
            },
          }
        : {}),
      tipo,
      descricao,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function buscarStatusAnteriorEquipamento({
  tenantId,
  manutencaoId,
}) {
  const evento = await prisma.manutencaoEvento.findFirst({
    where: {
      tenantId,
      manutencaoId,
      tipo: 'STATUS_BASE_EQUIPAMENTO',
    },
    orderBy: {
      dataEvento: 'asc',
    },
    select: {
      metadataJson: true,
    },
  });

  if (!evento?.metadataJson) return null;

  try {
    const metadata = JSON.parse(evento.metadataJson);
    return metadata?.statusAnterior || null;
  } catch (error) {
    console.error(
      `[MANUTENCAO_EVENTO_PARSE_ERROR] tenant=${tenantId} manutencao=${manutencaoId}`,
      error
    );
    return null;
  }
}

export async function deletarManutencao({
  tenantId,
  manutencaoId,
}) {
  return prisma.manutencao.delete({
    where: {
      tenantId_id: {
        tenantId,
        id: manutencaoId,
      },
    },
  });
}

export async function buscarManutencaoComAnexos({
  tenantId,
  manutencaoId,
}) {
  return prisma.manutencao.findFirst({
    where: {
      id: manutencaoId,
      tenantId,
    },
    include: {
      anexos: true,
    },
  });
}
