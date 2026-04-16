import prisma from '../prismaService.js';
import {
  resolveOperationalTimezone,
  MANUTENCAO_STATUSS_CONFLITANTES,
  FAR_FUTURE_UTC_DATE,
} from '../time/index.js';

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
  const tenant = await buscarTenantAtivo(tenantId);

  if (!tenant) {
    return {
      ok: false,
      status: 401,
      message: 'Tenant inválido ou inativo.',
    };
  }

  const equipamento = await buscarEquipamentoDoTenant({
    tenantId,
    equipamentoId,
  });

  if (!equipamento) {
    return {
      ok: false,
      status: 404,
      message: 'Equipamento não encontrado.',
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
    include: {
      anexos: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      equipamento: {
        include: {
          unidade: true,
        },
      },
      notasAndamento: {
        where: {
          tenantId,
        },
        orderBy: {
          data: 'desc',
        },
        include: {
          autor: {
            select: { nome: true },
          },
        },
      },
    },
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
    select: {
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
      agendamentoDataLocal: true,
      agendamentoHoraInicioLocal: true,
      agendamentoHoraFimLocal: true,
      agendamentoTimezone: true,
    },
  });
}

export async function listarManutencoes({
  tenantId,
  equipamentoId,
  unidadeId,
  tipo,
  status,
}) {
  const whereClause = { tenantId };

  if (equipamentoId) whereClause.equipamentoId = equipamentoId;
  if (tipo) whereClause.tipo = tipo;
  if (status) whereClause.status = status;

  if (unidadeId) {
    whereClause.equipamento = {
      tenantId,
      unidadeId,
    };
  }

  return prisma.manutencao.findMany({
    where: whereClause,
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
      anexos: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoInicio: 'desc',
    },
  });
}

export async function contarManutencoesDoTenant(tenantId) {
  return prisma.manutencao.count({
    where: { tenantId },
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
      agendamentoDataLocal: true,
      agendamentoHoraInicioLocal: true,
      agendamentoHoraFimLocal: true,
    },
  });
}

export async function criarManutencao(payload) {
  return prisma.manutencao.create({
    data: payload,
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
      anexos: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
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
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
      anexos: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      notasAndamento: {
        where: {
          tenantId,
        },
        orderBy: {
          data: 'desc',
        },
        include: {
          autor: {
            select: { nome: true },
          },
        },
      },
    },
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
  });
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