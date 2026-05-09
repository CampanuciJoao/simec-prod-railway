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

function calcularHorasParadoOsCorretiva(os) {
  const conclusao = toDateOrNull(os.dataHoraConclusao);
  if (!conclusao) return 0;

  if (os.statusEquipamentoAbertura === 'Inoperante') {
    const abertura = toDateOrNull(os.dataHoraAbertura);
    if (!abertura) return 0;
    return Math.max(0, differenceInMinutes(conclusao, abertura)) / 60;
  }

  const visitas = (os.visitas || []).filter((v) => v.resultado);
  if (!visitas.length) return 0;

  let totalMinutos = 0;
  for (const visita of visitas) {
    const inicio = toDateOrNull(visita.dataHoraInicioReal) || toDateOrNull(visita.dataHoraInicioPrevista);
    const fim = toDateOrNull(visita.dataHoraFimReal) || conclusao;
    if (inicio && fim && fim > inicio) totalMinutos += differenceInMinutes(fim, inicio);
  }
  return Math.max(0, totalMinutos) / 60;
}

export async function obterDadosPdfBI({ tenantId }) {
  const agora = new Date();
  const inicioAno = startOfYear(agora);
  const fimAno = endOfYear(agora);

  const [
    manutencoes,
    osCorretivas,
    totalEquipamentos,
    osConcluidasAno,
    backlogManutencoes,
    backlogOsCorretivas,
    preventivasAno,
  ] = await Promise.all([
    prisma.manutencao.findMany({
      where: { tenantId, status: 'Concluida', dataConclusao: { gte: inicioAno, lte: fimAno } },
      include: { equipamento: { include: { unidade: true } } },
      orderBy: { dataConclusao: 'desc' },
    }),
    prisma.osCorretiva.findMany({
      where: { tenantId, status: 'Concluida', dataHoraConclusao: { gte: inicioAno, lte: fimAno } },
      include: {
        equipamento: { include: { unidade: true } },
        visitas: {
          where: { resultado: { not: null } },
          select: {
            dataHoraInicioPrevista: true,
            dataHoraInicioReal: true,
            dataHoraFimReal: true,
            resultado: true,
          },
        },
      },
    }),
    prisma.equipamento.count({ where: { tenantId } }),
    prisma.osCorretiva.findMany({
      where: { tenantId, status: 'Concluida', dataHoraConclusao: { gte: inicioAno, lte: fimAno } },
      select: { dataHoraAbertura: true, dataHoraConclusao: true },
    }),
    prisma.manutencao.count({ where: { tenantId, status: { notIn: ['Concluida', 'Cancelada'] } } }),
    prisma.osCorretiva.count({ where: { tenantId, status: { not: 'Concluida' } } }),
    prisma.manutencao.findMany({
      where: { tenantId, tipo: 'Preventiva', status: 'Concluida', dataConclusao: { gte: inicioAno, lte: fimAno } },
      select: { dataConclusao: true, dataHoraAgendamentoFim: true },
    }),
  ]);

  const statsEquip = {};
  const statsUnidade = {};

  const garantirEquip = (eId, equip) => {
    if (!statsEquip[eId]) {
      statsEquip[eId] = {
        equipamentoId: eId,
        modelo: equip.modelo,
        tag: equip.tag,
        unidadeId: equip.unidadeId,
        unidade: equip.unidade?.nomeSistema || 'N/A',
        corretivas: 0,
        preventivas: 0,
        horasParado: 0,
      };
    }
  };

  const garantirUnidade = (uId, uNome) => {
    if (!statsUnidade[uId]) statsUnidade[uId] = { unidadeId: uId, nome: uNome, horasParado: 0 };
  };

  for (const m of manutencoes) {
    if (!m.equipamento?.unidade) continue;
    const eId = m.equipamentoId;
    const uId = m.equipamento.unidadeId;
    garantirEquip(eId, m.equipamento);
    garantirUnidade(uId, m.equipamento.unidade.nomeSistema);
    if (m.tipo === 'Corretiva') statsEquip[eId].corretivas += 1;
    else if (m.tipo === 'Preventiva') statsEquip[eId].preventivas += 1;
    const h = calcularHorasParado(m);
    statsEquip[eId].horasParado += h;
    statsUnidade[uId].horasParado += h;
  }

  for (const os of osCorretivas) {
    if (!os.equipamento?.unidade) continue;
    const eId = os.equipamentoId;
    const uId = os.equipamento.unidadeId;
    garantirEquip(eId, os.equipamento);
    garantirUnidade(uId, os.equipamento.unidade.nomeSistema);
    statsEquip[eId].corretivas += 1;
    const h = calcularHorasParadoOsCorretiva(os);
    statsEquip[eId].horasParado += h;
    statsUnidade[uId].horasParado += h;
  }

  const manutencoesPreventivas = manutencoes.filter((m) => m.tipo === 'Preventiva').length;
  const manutencoesCorretivas = manutencoes.filter((m) => m.tipo === 'Corretiva').length + osCorretivas.length;

  // MTTR
  let mttrHoras = null;
  if (osConcluidasAno.length > 0) {
    const totalMin = osConcluidasAno.reduce((acc, os) => {
      if (!os.dataHoraAbertura || !os.dataHoraConclusao) return acc;
      return acc + differenceInMinutes(new Date(os.dataHoraConclusao), new Date(os.dataHoraAbertura));
    }, 0);
    mttrHoras = Math.round((totalMin / osConcluidasAno.length / 60) * 10) / 10;
  }

  // Conformidade PM
  let conformidadePM = null;
  if (preventivasAno.length > 0) {
    const noPrazo = preventivasAno.filter(
      (m) => m.dataConclusao && m.dataHoraAgendamentoFim && new Date(m.dataConclusao) <= new Date(m.dataHoraAgendamentoFim)
    ).length;
    conformidadePM = Math.round((noPrazo / preventivasAno.length) * 100);
  }

  const backlog = backlogManutencoes + backlogOsCorretivas;

  // MTBF
  const horasDecorridas = differenceInMinutes(agora, inicioAno) / 60;
  const mtbfHoras = manutencoesCorretivas > 0
    ? Math.round((horasDecorridas / manutencoesCorretivas) * 10) / 10
    : null;

  // Disponibilidade %
  const totalHorasFlota = totalEquipamentos * horasDecorridas;
  const totalDowntimeFlota = Object.values(statsEquip).reduce((a, e) => a + e.horasParado, 0);
  const disponibilidadePct = totalHorasFlota > 0
    ? Math.round(((totalHorasFlota - totalDowntimeFlota) / totalHorasFlota) * 1000) / 10
    : null;

  // Evolução mensal
  const mesAtual = agora.getMonth();
  const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const evolucaoMensal = Array.from({ length: mesAtual + 1 }, (_, mesIdx) => ({
    mes: MESES_PT[mesIdx],
    preventivas: manutencoes.filter(
      (m) => m.tipo === 'Preventiva' && m.dataConclusao && new Date(m.dataConclusao).getMonth() === mesIdx
    ).length,
    corretivas:
      manutencoes.filter((m) => m.tipo === 'Corretiva' && m.dataConclusao && new Date(m.dataConclusao).getMonth() === mesIdx).length +
      osCorretivas.filter((os) => os.dataHoraConclusao && new Date(os.dataHoraConclusao).getMonth() === mesIdx).length,
    downtime: Math.round((
      manutencoes
        .filter((m) => m.dataConclusao && new Date(m.dataConclusao).getMonth() === mesIdx)
        .reduce((acc, m) => acc + calcularHorasParado(m), 0) +
      osCorretivas
        .filter((os) => os.dataHoraConclusao && new Date(os.dataHoraConclusao).getMonth() === mesIdx)
        .reduce((acc, os) => acc + calcularHorasParadoOsCorretiva(os), 0)
    ) * 10) / 10,
  }));

  // Reincidentes
  const reincidentes = Object.values(statsEquip)
    .filter((e) => e.corretivas >= 2)
    .sort((a, b) => b.corretivas - a.corretivas)
    .slice(0, 10);

  return {
    ano: agora.getFullYear(),
    resumoGeral: {
      totalAtivos: totalEquipamentos,
      preventivas: manutencoesPreventivas,
      corretivas: manutencoesCorretivas,
      totalManutencoesConcluidas: manutencoes.length + osCorretivas.length,
    },
    kpis: { mttrHoras, conformidadePM, backlog, mtbfHoras, disponibilidadePct },
    rankingDowntime: Object.values(statsEquip).sort((a, b) => b.horasParado - a.horasParado).slice(0, 10),
    rankingFrequencia: Object.values(statsEquip).sort((a, b) => b.corretivas - a.corretivas).slice(0, 10),
    rankingUnidades: Object.values(statsUnidade).sort((a, b) => b.horasParado - a.horasParado).slice(0, 10),
    evolucaoMensal,
    reincidentes,
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

export async function obterDadosPdfOcorrencia({ tenantId, ocorrenciaId }) {
  if (!ocorrenciaId) throw new Error('OCORRENCIA_ID_INVALIDO');

  const ocorrencia = await prisma.ocorrencia.findFirst({
    where: { id: ocorrenciaId, tenantId },
    include: {
      equipamento: {
        include: {
          unidade: { select: { nomeSistema: true, timezone: true } },
        },
      },
    },
  });

  if (!ocorrencia) throw new Error('OCORRENCIA_NAO_ENCONTRADA');

  return ocorrencia;
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
          timezone: true,
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
      unidadeTimezone: equipamento.unidade?.timezone || null,
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
