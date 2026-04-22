import prisma from '../prismaService.js';
import {
  buscarInventarioEquipamentos,
  buscarManutencoesRealizadas,
} from '../reportQueryService.js';
import {
  exportarHistoricoAtivoPorEquipamento,
} from '../historicoAtivoService.js';
import { startOfYear, endOfYear, differenceInMinutes } from 'date-fns';

function toDateOrNull(value) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calcularHorasParado(manutencao) {
  const inicio =
    toDateOrNull(manutencao.dataInicioReal) ||
    toDateOrNull(manutencao.dataHoraAgendamentoInicio);

  const fim =
    toDateOrNull(manutencao.dataFimReal) ||
    toDateOrNull(manutencao.dataConclusao) ||
    toDateOrNull(manutencao.dataHoraAgendamentoFim);

  if (!inicio || !fim || fim < inicio) {
    return 0;
  }

  return Math.max(0, differenceInMinutes(fim, inicio)) / 60;
}

function normalizarIdList(ids = []) {
  if (!Array.isArray(ids)) return [];

  const idsValidos = ids
    .filter((id) => typeof id === 'string' && id.trim() !== '')
    .map((id) => id.trim());

  return [...new Set(idsValidos)];
}

export async function obterDadosPdfBI({ tenantId }) {
  const agora = new Date();
  const inicioAno = startOfYear(agora);
  const fimAno = endOfYear(agora);

  const [manutencoes, totalEquipamentos] = await Promise.all([
    prisma.manutencao.findMany({
      where: {
        tenantId,
        status: 'Concluida',
        dataConclusao: {
          gte: inicioAno,
          lte: fimAno,
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
        dataConclusao: 'desc',
      },
    }),
    prisma.equipamento.count({
      where: {
        tenantId,
      },
    }),
  ]);

  const statsEquip = {};
  const statsUnidade = {};

  for (const manutencao of manutencoes) {
    if (!manutencao.equipamento || !manutencao.equipamento.unidade) {
      continue;
    }

    const equipamentoId = manutencao.equipamentoId;
    const unidadeId = manutencao.equipamento.unidadeId;
    const unidadeNome = manutencao.equipamento.unidade.nomeSistema;

    if (!statsEquip[equipamentoId]) {
      statsEquip[equipamentoId] = {
        equipamentoId,
        modelo: manutencao.equipamento.modelo,
        tag: manutencao.equipamento.tag,
        unidadeId,
        unidade: unidadeNome,
        corretivas: 0,
        preventivas: 0,
        horasParado: 0,
      };
    }

    if (!statsUnidade[unidadeId]) {
      statsUnidade[unidadeId] = {
        unidadeId,
        nome: unidadeNome,
        horasParado: 0,
      };
    }

    if (manutencao.tipo === 'Corretiva') {
      statsEquip[equipamentoId].corretivas += 1;
    } else if (manutencao.tipo === 'Preventiva') {
      statsEquip[equipamentoId].preventivas += 1;
    }

    const horasParado = calcularHorasParado(manutencao);
    statsEquip[equipamentoId].horasParado += horasParado;
    statsUnidade[unidadeId].horasParado += horasParado;
  }

  return {
    ano: agora.getFullYear(),
    resumoGeral: {
      totalAtivos: totalEquipamentos,
      preventivas: manutencoes.filter((item) => item.tipo === 'Preventiva').length,
      corretivas: manutencoes.filter((item) => item.tipo === 'Corretiva').length,
      totalManutencoesConcluidas: manutencoes.length,
    },
    rankingDowntime: Object.values(statsEquip)
      .sort((a, b) => b.horasParado - a.horasParado)
      .slice(0, 10),
    rankingFrequencia: Object.values(statsEquip)
      .sort((a, b) => b.corretivas - a.corretivas)
      .slice(0, 10),
    rankingUnidades: Object.values(statsUnidade)
      .sort((a, b) => b.horasParado - a.horasParado)
      .slice(0, 10),
  };
}

export async function obterDadosPdfManutencao({ tenantId, manutencaoId }) {
  if (!manutencaoId || typeof manutencaoId !== 'string') {
    throw new Error('MANUTENCAO_ID_INVALIDO');
  }

  const manutencao = await prisma.manutencao.findFirst({
    where: {
      id: manutencaoId,
      tenantId,
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
      anexos: {
        where: {
          tenantId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      notasAndamento: {
        where: {
          tenantId,
        },
        include: {
          autor: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
        orderBy: {
          data: 'asc',
        },
      },
    },
  });

  if (!manutencao) {
    throw new Error('MANUTENCAO_NAO_ENCONTRADA');
  }

  return manutencao;
}

export async function obterDadosPdfRelatorio({ tenantId, filtros = {} }) {
  const {
    tipoRelatorio,
    dataInicio,
    dataFim,
    unidadeId,
    equipamentoId,
    tipoManutencao,
    fabricante,
    status,
  } = filtros;

  if (!tipoRelatorio || typeof tipoRelatorio !== 'string') {
    throw new Error('TIPO_RELATORIO_OBRIGATORIO');
  }

  if (tipoRelatorio === 'inventarioEquipamentos') {
    const dados = await buscarInventarioEquipamentos({
      tenantId,
      unidadeId: unidadeId || null,
      fabricante: fabricante ? String(fabricante).trim() : null,
      status: status ? String(status).trim() : null,
    });

    return {
      tipoRelatorio,
      tenantId,
      periodo: {
        inicio: null,
        fim: null,
      },
      filtros: {
        unidadeId: unidadeId || null,
        fabricante: fabricante || null,
        tipoManutencao: null,
        equipamentoId: null,
        status: status || null,
      },
      total: dados.length,
      dados,
    };
  }

  if (tipoRelatorio === 'manutencoesRealizadas') {
    if (!dataInicio || !dataFim) {
      throw new Error('PERIODO_OBRIGATORIO');
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      throw new Error('PERIODO_INVALIDO');
    }

    if (inicio > fim) {
      throw new Error('PERIODO_INVERTIDO');
    }

    const dados = await buscarManutencoesRealizadas({
      tenantId,
      dataInicio,
      dataFim,
      unidadeId: unidadeId || null,
      equipamentoId: equipamentoId || null,
      tipoManutencao: tipoManutencao ? String(tipoManutencao).trim() : null,
    });

    return {
      tipoRelatorio,
      tenantId,
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },
      filtros: {
        unidadeId: unidadeId || null,
        fabricante: null,
        tipoManutencao: tipoManutencao || null,
        equipamentoId: equipamentoId || null,
        status: null,
      },
      total: dados.length,
      dados,
    };
  }

  throw new Error('TIPO_RELATORIO_INVALIDO');
}

export async function obterDadosPdfRelatorioPorIds({ tenantId, ids = [] }) {
  const idsUnicos = normalizarIdList(ids);

  if (!idsUnicos.length) {
    throw new Error('IDS_RELATORIO_INVALIDOS');
  }

  const manutencoes = await prisma.manutencao.findMany({
    where: {
      tenantId,
      id: {
        in: idsUnicos,
      },
    },
    select: {
      id: true,
      numeroOS: true,
      tipo: true,
      status: true,
      dataHoraAgendamentoInicio: true,
      dataHoraAgendamentoFim: true,
      dataInicioReal: true,
      dataFimReal: true,
      dataConclusao: true,
      tecnicoResponsavel: true,
      descricaoProblemaServico: true,
      numeroChamado: true,
      equipamento: {
        select: {
          id: true,
          modelo: true,
          tag: true,
          tipo: true,
          fabricante: true,
          unidade: {
            select: {
              id: true,
              nomeSistema: true,
              nomeFantasia: true,
              cidade: true,
              estado: true,
            },
          },
        },
      },
    },
    orderBy: {
      dataConclusao: 'desc',
    },
  });

  return {
    tipoRelatorio: 'manutencoesRealizadas',
    totalSolicitado: idsUnicos.length,
    totalEncontrado: manutencoes.length,
    ids: idsUnicos,
    dados: manutencoes,
  };
}

export async function obterDadosPdfHistoricoEquipamento({
  tenantId,
  equipamentoId,
  categoria = null,
  subcategoria = null,
  dataInicio = null,
  dataFim = null,
}) {
  const equipamento = await prisma.equipamento.findFirst({
    where: {
      id: equipamentoId,
      tenantId,
    },
    include: {
      unidade: {
        select: {
          id: true,
          nomeSistema: true,
        },
      },
    },
  });

  if (!equipamento) {
    throw new Error('EQUIPAMENTO_NAO_ENCONTRADO');
  }

  const eventos = await exportarHistoricoAtivoPorEquipamento({
    tenantId,
    equipamentoId,
    categoria,
    subcategoria,
    dataInicio,
    dataFim,
  });

  return {
    equipamento: {
      id: equipamento.id,
      modelo: equipamento.modelo,
      tag: equipamento.tag,
      unidade: equipamento.unidade?.nomeSistema || null,
    },
    filtros: {
      categoria,
      subcategoria,
      dataInicio,
      dataFim,
    },
    eventos,
  };
}
