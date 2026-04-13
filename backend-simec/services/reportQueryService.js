// Ficheiro: services/reportQueryService.js
// Versão: Multi-tenant ready
// Descrição: Queries de relatórios com isolamento por tenant

import prisma from './prismaService.js';

/**
 * Busca manutenções realizadas com filtros dinâmicos
 */
export async function buscarManutencoesRealizadas({
  tenantId,
  dataInicio,
  dataFim,
  unidadeId,
  equipamentoId,
  tipoManutencao,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  const whereClause = {
    tenantId,
    status: 'Concluida',
  };

  if (dataInicio && dataFim) {
    const inicio = new Date(dataInicio);
    const dataFimAjustada = new Date(dataFim);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(dataFimAjustada.getTime())) {
      throw new Error('PERIODO_INVALIDO');
    }

    dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
    dataFimAjustada.setMilliseconds(
      dataFimAjustada.getMilliseconds() - 1
    );

    whereClause.dataConclusao = {
      gte: inicio,
      lte: dataFimAjustada,
    };
  }

  if (tipoManutencao) {
    whereClause.tipo = tipoManutencao;
  }

  if (equipamentoId) {
    whereClause.equipamentoId = equipamentoId;
  }

  if (unidadeId) {
    whereClause.equipamento = {
      tenantId,
      unidadeId,
    };
  }

  return prisma.manutencao.findMany({
    where: whereClause,
    select: {
      id: true,
      numeroOS: true,
      tipo: true,
      status: true,
      dataConclusao: true,
      dataHoraAgendamentoInicio: true,
      tecnicoResponsavel: true,
      descricaoProblemaServico: true,
      numeroChamado: true,
      equipamento: {
        select: {
          id: true,
          modelo: true,
          tag: true,
          unidade: {
            select: {
              nomeSistema: true,
            },
          },
        },
      },
    },
    orderBy: {
      dataConclusao: 'desc',
    },
  });
}

/**
 * Busca inventário de equipamentos
 */
export async function buscarInventarioEquipamentos({
  tenantId,
  unidadeId,
  fabricante,
  status,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  const whereClause = {
    tenantId,
  };

  if (unidadeId) {
    whereClause.unidadeId = unidadeId;
  }

  if (fabricante) {
    whereClause.fabricante = {
      contains: fabricante,
      mode: 'insensitive',
    };
  }

  if (status) {
    whereClause.status = status;
  }

  return prisma.equipamento.findMany({
    where: whereClause,
    select: {
      id: true,
      modelo: true,
      tag: true,
      fabricante: true,
      registroAnvisa: true,
      status: true,
      unidade: {
        select: {
          nomeSistema: true,
        },
      },
    },
    orderBy: {
      modelo: 'asc',
    },
  });
}