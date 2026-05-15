import prisma from '../../../prismaService.js';
import { buscarManutencoesRealizadas } from '../../../reportQueryService.js';

// Limites operacionais para PDFs gerados via chat agent.
// Definidos em [[feedback-pdf-limites]] — evitam relatorios gigantes
// inutilizaveis e estouro de memoria no gerador.
export const LIMITES_RELATORIO = {
  PERIODO_DEFAULT_MESES: 6,
  PERIODO_MAX_MESES:     12,
  ITENS_MAX:             50,
};

function aplicarPeriodoComLimites(dataInicio, dataFim) {
  const fim = dataFim ? new Date(dataFim) : new Date();
  const inicio = dataInicio ? new Date(dataInicio) : null;

  // Sem inicio explicito -> aplica default 6 meses
  if (!inicio) {
    const padrao = new Date(fim);
    padrao.setMonth(padrao.getMonth() - LIMITES_RELATORIO.PERIODO_DEFAULT_MESES);
    return {
      inicio: padrao,
      fim,
      periodoUsado: `últimos ${LIMITES_RELATORIO.PERIODO_DEFAULT_MESES} meses (default)`,
      foiCapado: false,
    };
  }

  // Limite maximo: se passou de 12 meses, capa e orienta
  const limite = new Date(fim);
  limite.setMonth(limite.getMonth() - LIMITES_RELATORIO.PERIODO_MAX_MESES);
  if (inicio < limite) {
    const anoPedido = inicio.getFullYear();
    return {
      inicio: limite,
      fim,
      periodoUsado: `últimos ${LIMITES_RELATORIO.PERIODO_MAX_MESES} meses (capado)`,
      foiCapado: true,
      mensagemOrientativa:
        `O período máximo por relatório é ${LIMITES_RELATORIO.PERIODO_MAX_MESES} meses. ` +
        `Ajustei para os últimos ${LIMITES_RELATORIO.PERIODO_MAX_MESES} meses. ` +
        `Para ver dados mais antigos (ex: ${anoPedido}), peça por ano específico — ` +
        `'todas preventivas do equipamento X em ${anoPedido}'.`,
    };
  }

  return { inicio, fim, periodoUsado: null, foiCapado: false };
}

export async function buscarUltimaManutencao({
  tenantId,
  tipoManutencao,
  unidadeId,
  equipamentoId,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  const where = {
    tenantId,
    tipo: tipoManutencao,
  };

  if (equipamentoId) {
    where.equipamentoId = equipamentoId;
  } else if (unidadeId) {
    where.equipamento = {
      tenantId,
      unidadeId,
    };
  }

  return prisma.manutencao.findFirst({
    where,
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoInicio: 'desc',
    },
  });
}

/**
 * Busca lista de manutencoes para o agente — aplica limites de periodo
 * e quantidade. Retorna { items, totalEncontrado, limitado, periodoUsado }
 * para o presenter expor isso ao usuario.
 */
export async function buscarListaManutencoesRelatorio({
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

  const periodo = aplicarPeriodoComLimites(dataInicio, dataFim);

  const todos = await buscarManutencoesRealizadas({
    tenantId,
    dataInicio: periodo.inicio.toISOString(),
    dataFim: periodo.fim.toISOString(),
    unidadeId,
    equipamentoId,
    tipoManutencao,
  });

  // Ja vem ordenado por dataConclusao desc — pega apenas os mais recentes
  const limitado = todos.length > LIMITES_RELATORIO.ITENS_MAX;
  const items = limitado ? todos.slice(0, LIMITES_RELATORIO.ITENS_MAX) : todos;

  return {
    items,
    totalEncontrado: todos.length,
    limitado,
    periodoUsado: periodo.periodoUsado,
    periodoCapado: periodo.foiCapado,
    periodoMensagemOrientativa: periodo.mensagemOrientativa || null,
    periodoInicio: periodo.inicio,
    periodoFim: periodo.fim,
  };
}