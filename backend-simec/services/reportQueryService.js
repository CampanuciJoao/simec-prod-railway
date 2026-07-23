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
 * Busca equipamentos com serviços vinculados (contratos, seguros, manutenções)
 */
export async function buscarEquipamentosComServicos({
  tenantId,
  unidadeId,
  tipo,
  fabricante,
  status,
}) {
  if (!tenantId) throw new Error('TENANT_ID_OBRIGATORIO');

  const where = { tenantId };
  if (unidadeId) where.unidadeId = unidadeId;
  if (tipo) where.tipo = { contains: tipo, mode: 'insensitive' };
  if (fabricante) where.fabricante = { contains: fabricante, mode: 'insensitive' };
  if (status) where.status = status;

  return prisma.equipamento.findMany({
    where,
    select: {
      id: true,
      modelo: true,
      tipo: true,
      tag: true,
      status: true,
      fabricante: true,
      setor: true,
      numeroPatrimonio: true,
      registroAnvisa: true,
      unidade: { select: { nomeSistema: true } },
      contratosCobertos: {
        select: {
          numeroContrato: true,
          fornecedor: true,
          categoria: true,
          dataFim: true,
          status: true,
        },
        take: 20,
      },
      seguros: {
        select: {
          apoliceNumero: true,
          seguradora: true,
          dataFim: true,
          status: true,
        },
        orderBy: { dataFim: 'desc' },
        take: 10,
      },
      manutencoes: {
        select: {
          tipo: true,
          status: true,
          dataConclusao: true,
          dataHoraAgendamentoInicio: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
    orderBy: [
      { unidade: { nomeSistema: 'asc' } },
      { modelo: 'asc' },
    ],
  });
}

/**
 * Busca inventário de seguros com filtros dinâmicos
 *
 * escopo:
 *   'todos'         → sem filtro por tipoAlvo
 *   'empresarial'   → tipoAlvo = EMPRESARIAL_GERAL
 *   'equipamento'   → tipoAlvo = EQUIPAMENTO
 *   'veiculo'       → tipoAlvo = VEICULO
 *   'unidade'       → tipoAlvo = UNIDADE
 *
 * unidadeId filtra tanto pela unidade DIRETA do seguro quanto pela unidade
 * do equipamento/veiculo vinculado (caso a apolice cubra um ativo especifico).
 */
export async function buscarInventarioSeguros({
  tenantId,
  escopo,
  unidadeId,
  status,
  seguradora,
  vencimentoInicio,
  vencimentoFim,
}) {
  if (!tenantId) throw new Error('TENANT_ID_OBRIGATORIO');

  const ESCOPO_ALVO = {
    empresarial: 'EMPRESARIAL_GERAL',
    equipamento: 'EQUIPAMENTO',
    veiculo:     'VEICULO',
    unidade:     'UNIDADE',
  };

  const whereClause = { tenantId };

  if (escopo && ESCOPO_ALVO[escopo]) {
    whereClause.tipoAlvo = ESCOPO_ALVO[escopo];
  }

  if (status) {
    whereClause.status = status;
  }

  if (seguradora) {
    whereClause.seguradora = { contains: seguradora, mode: 'insensitive' };
  }

  if (vencimentoInicio || vencimentoFim) {
    whereClause.dataFim = {};
    if (vencimentoInicio) whereClause.dataFim.gte = new Date(vencimentoInicio);
    if (vencimentoFim) {
      const fim = new Date(vencimentoFim);
      fim.setDate(fim.getDate() + 1);
      fim.setMilliseconds(fim.getMilliseconds() - 1);
      whereClause.dataFim.lte = fim;
    }
  }

  if (unidadeId) {
    // Match a apolice tem: (a) unidade direta = unidadeId, OU
    // (b) equipamento na unidade, OU (c) veiculo na unidade.
    whereClause.OR = [
      { unidadeId },
      { equipamento: { unidadeId } },
      { veiculo: { unidadeId } },
    ];
  }

  return prisma.seguro.findMany({
    where: whereClause,
    select: {
      id: true,
      apoliceNumero: true,
      seguradora: true,
      tipoAlvo: true,
      tipoSeguro: true,
      status: true,
      dataInicio: true,
      dataFim: true,
      cobertura: true,
      premioTotal: true,
      lmiAPP: true,
      lmiDanosCorporais: true,
      lmiDanosEletricos: true,
      lmiDanosMateriais: true,
      lmiDanosMorais: true,
      lmiIncendio: true,
      lmiResponsabilidadeCivil: true,
      lmiRoubo: true,
      lmiVidros: true,
      lmiVendaval: true,
      lmiColisao: true,
      lmiDanosCausaExterna: true,
      lmiPerdaLucroBruto: true,
      lmiVazamentoTanques: true,
      unidade:     { select: { id: true, nomeSistema: true } },
      equipamento: { select: { id: true, apelido: true, modelo: true, tag: true, unidade: { select: { nomeSistema: true } } } },
      veiculo:     { select: { id: true, placa: true, modelo: true, unidade: { select: { nomeSistema: true } } } },
    },
    orderBy: { dataFim: 'asc' },
  });
}

/**
 * Busca inventário de equipamentos
 */
export async function buscarInventarioEquipamentos({
  tenantId,
  unidadeId,
  fabricante,
  tipo,
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

  if (tipo) {
    whereClause.tipo = {
      contains: tipo,
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
      tipo: true,
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
