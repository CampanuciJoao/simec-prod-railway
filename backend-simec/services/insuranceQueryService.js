// Ficheiro: services/insuranceQueryService.js
// Versão: Multi-tenant ready

import prisma from './prismaService.js';

function getSeguroInclude() {
  return {
    equipamento: {
      select: {
        id: true,
        modelo: true,
        tag: true,
        tipo: true,
      },
    },
    unidade: {
      select: {
        id: true,
        nomeSistema: true,
      },
    },
    anexos: {
      select: {
        id: true,
        nomeOriginal: true,
        path: true,
        tipoMime: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    },
  };
}

function aplicarFiltroAlvo(where, { unidadeId = null, equipamentoId = null }) {
  if (equipamentoId) {
    where.equipamentoId = equipamentoId;
  } else if (unidadeId) {
    where.unidadeId = unidadeId;
  }

  return where;
}

function validarData(data, nomeCampo) {
  if (!data) return null;

  const dt = new Date(data);

  if (Number.isNaN(dt.getTime())) {
    throw new Error(`${nomeCampo}_INVALIDA`);
  }

  return dt;
}

export async function buscarSeguroMaisRecente({
  tenantId,
  unidadeId = null,
  equipamentoId = null,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  const where = aplicarFiltroAlvo(
    {
      tenantId,
      status: {
        not: 'Cancelado',
      },
    },
    { unidadeId, equipamentoId }
  );

  return prisma.seguro.findFirst({
    where,
    include: getSeguroInclude(),
    orderBy: [{ dataFim: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function buscarSeguroVigente({
  tenantId,
  unidadeId = null,
  equipamentoId = null,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  const agora = new Date();
  const fimDoDia = new Date(agora);
  fimDoDia.setHours(23, 59, 59, 999);

  const where = aplicarFiltroAlvo(
    {
      tenantId,
      dataInicio: { lte: fimDoDia },
      dataFim: { gte: agora },
      status: {
        in: ['Ativo', 'Vigente'],
      },
    },
    { unidadeId, equipamentoId }
  );

  return prisma.seguro.findFirst({
    where,
    include: getSeguroInclude(),
    orderBy: [{ dataFim: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function buscarSegurosPorPeriodo({
  tenantId,
  unidadeId = null,
  equipamentoId = null,
  dataInicio = null,
  dataFim = null,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  const where = aplicarFiltroAlvo(
    {
      tenantId,
      status: {
        not: 'Cancelado',
      },
    },
    { unidadeId, equipamentoId }
  );

  const and = [];

  if (dataInicio) {
    const inicio = validarData(dataInicio, 'DATA_INICIO');

    and.push({
      dataFim: {
        gte: inicio,
      },
    });
  }

  if (dataFim) {
    const fim = validarData(dataFim, 'DATA_FIM');
    fim.setHours(23, 59, 59, 999);

    and.push({
      dataInicio: {
        lte: fim,
      },
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return prisma.seguro.findMany({
    where,
    include: getSeguroInclude(),
    orderBy: [{ dataFim: 'desc' }, { createdAt: 'desc' }],
  });
}