// Calcula o status de controle de manutencoes pro dashboard "Controle"
// na pagina de Manutencoes. Duas secoes:
//
//   1. Equipamentos — todos com Equipamento.frequenciaPreventivaMeses
//      preenchido. Pra cada um, acha a ultima Manutencao concluida com
//      tipo=Preventiva e calcula proxima data esperada.
//
//   2. Prediais — todas RotinaPredial ativas. Pra cada uma, acha a
//      ultima Manutencao concluida matching (unidadePredialId +
//      tipoServicoPredial) e calcula proxima data.
//
// Status (baseado em diasRestantes = proxima - hoje):
//   - em_dia       : diasRestantes > 30
//   - proximo      : 0 < diasRestantes <= 30
//   - vencido      : diasRestantes <= 0
//   - sem_historico: nunca foi realizada

import prisma from '../prismaService.js';
import {
  gerarNumeroOS,
  gerarNumeroOSPredial,
} from './manutencaoSchedulingRules.js';
import { contarManutencoesDoTenant } from './manutencaoRepository.js';
import { registrarLog } from '../logService.js';

const DIAS_ALERTA_PROXIMO = 30;

function calcularProximaData(ultimaData, frequenciaMeses) {
  if (!ultimaData) return null;
  const proxima = new Date(ultimaData);
  proxima.setMonth(proxima.getMonth() + frequenciaMeses);
  return proxima;
}

function classificarStatus(proximaData) {
  if (!proximaData) return { status: 'sem_historico', diasRestantes: null };
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  const alvo = new Date(proximaData);
  alvo.setHours(0, 0, 0, 0);
  const diffMs = alvo.getTime() - agora.getTime();
  const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diasRestantes <= 0) return { status: 'vencido', diasRestantes };
  if (diasRestantes <= DIAS_ALERTA_PROXIMO) return { status: 'proximo', diasRestantes };
  return { status: 'em_dia', diasRestantes };
}

async function montarEquipamentos(tenantId) {
  const equipamentos = await prisma.equipamento.findMany({
    where: {
      tenantId,
      frequenciaPreventivaMeses: { not: null },
    },
    select: {
      id: true,
      tag: true,
      modelo: true,
      apelido: true,
      fabricante: true,
      tipo: true,
      status: true,
      unidadeId: true,
      frequenciaPreventivaMeses: true,
      unidade: {
        select: { id: true, nomeSistema: true },
      },
    },
    orderBy: [{ unidade: { nomeSistema: 'asc' } }, { modelo: 'asc' }],
  });

  const resultados = [];
  for (const eq of equipamentos) {
    const ultima = await prisma.manutencao.findFirst({
      where: {
        tenantId,
        equipamentoId: eq.id,
        categoria: 'Equipamento',
        tipo: 'Preventiva',
        status: 'Concluida',
      },
      orderBy: { dataConclusao: 'desc' },
      select: {
        id: true,
        numeroOS: true,
        dataConclusao: true,
        tecnicoResponsavel: true,
      },
    });

    const proximaPrevista = calcularProximaData(
      ultima?.dataConclusao,
      eq.frequenciaPreventivaMeses,
    );
    const classificacao = classificarStatus(proximaPrevista);

    resultados.push({
      tipo: 'equipamento',
      equipamentoId: eq.id,
      nome: eq.apelido || eq.modelo,
      tag: eq.tag,
      modelo: eq.modelo,
      fabricante: eq.fabricante,
      tipoEquipamento: eq.tipo,
      unidadeId: eq.unidadeId,
      unidadeNome: eq.unidade?.nomeSistema || '—',
      frequenciaMeses: eq.frequenciaPreventivaMeses,
      ultimaRealizadaEm: ultima?.dataConclusao || null,
      ultimaOS: ultima?.numeroOS || null,
      ultimoResponsavel: ultima?.tecnicoResponsavel || null,
      proximaPrevistaEm: proximaPrevista,
      ...classificacao,
    });
  }

  return resultados;
}

async function montarPrediais(tenantId) {
  const rotinas = await prisma.rotinaPredial.findMany({
    where: { tenantId, ativa: true },
    include: {
      unidade: { select: { id: true, nomeSistema: true } },
    },
    orderBy: [{ unidade: { nomeSistema: 'asc' } }, { tipoServicoPredial: 'asc' }],
  });

  const resultados = [];
  for (const r of rotinas) {
    const ultima = await prisma.manutencao.findFirst({
      where: {
        tenantId,
        categoria: 'Predial',
        unidadePredialId: r.unidadeId,
        tipoServicoPredial: r.tipoServicoPredial,
        status: 'Concluida',
      },
      orderBy: { dataConclusao: 'desc' },
      select: {
        id: true,
        numeroOS: true,
        dataConclusao: true,
        tecnicoResponsavel: true,
      },
    });

    const proximaPrevista = calcularProximaData(ultima?.dataConclusao, r.frequenciaMeses);
    const classificacao = classificarStatus(proximaPrevista);

    resultados.push({
      tipo: 'predial',
      rotinaId: r.id,
      tipoServicoPredial: r.tipoServicoPredial,
      unidadeId: r.unidadeId,
      unidadeNome: r.unidade?.nomeSistema || '—',
      frequenciaMeses: r.frequenciaMeses,
      ultimaRealizadaEm: ultima?.dataConclusao || null,
      ultimaOS: ultima?.numeroOS || null,
      ultimoResponsavel: ultima?.tecnicoResponsavel || null,
      proximaPrevistaEm: proximaPrevista,
      ...classificacao,
    });
  }

  return resultados;
}

function montarResumo(items) {
  const resumo = { total: items.length, em_dia: 0, proximo: 0, vencido: 0, sem_historico: 0 };
  for (const it of items) {
    resumo[it.status] = (resumo[it.status] || 0) + 1;
  }
  return resumo;
}

export async function obterControleManutencoes({ tenantId }) {
  const [equipamentos, prediais] = await Promise.all([
    montarEquipamentos(tenantId),
    montarPrediais(tenantId),
  ]);

  const total = [...equipamentos, ...prediais];

  return {
    equipamentos,
    prediais,
    resumo: {
      geral: montarResumo(total),
      equipamentos: montarResumo(equipamentos),
      prediais: montarResumo(prediais),
    },
  };
}

// Historico de manutencoes concluidas de um equipamento ou rotina predial.
// Usado pelo modal "ver ultimas N manutencoes" com download de PDF.
export async function obterHistoricoControleManutencoes({
  tenantId, equipamentoId, unidadePredialId, tipoServicoPredial, limite = 10,
}) {
  const where = { tenantId, status: 'Concluida' };
  if (equipamentoId) {
    where.categoria = 'Equipamento';
    where.equipamentoId = equipamentoId;
    where.tipo = 'Preventiva';
  } else if (unidadePredialId && tipoServicoPredial) {
    where.categoria = 'Predial';
    where.unidadePredialId = unidadePredialId;
    where.tipoServicoPredial = tipoServicoPredial;
  } else {
    return [];
  }

  const registros = await prisma.manutencao.findMany({
    where,
    orderBy: { dataConclusao: 'desc' },
    take: Math.min(Math.max(limite, 1), 50),
    select: {
      id: true,
      numeroOS: true,
      tipo: true,
      dataConclusao: true,
      tecnicoResponsavel: true,
      numeroChamado: true,
      descricaoProblemaServico: true,
      custoTotal: true,
      _count: { select: { anexos: true } },
    },
  });

  // Achata _count.anexos em anexosCount — a UI usa pra mostrar o
  // paperclip no card do historico (predial ou equipamento).
  return registros.map(({ _count, ...resto }) => ({
    ...resto,
    anexosCount: _count?.anexos ?? 0,
  }));
}

// Registra uma execucao passada (backfill) direto do modal do Controle de
// Manutencoes. Cria uma Manutencao ja Concluida com dataConclusao na data
// informada, pra alimentar o historico de rotinas sem o usuario ter que
// passar pelo fluxo "criar OS -> concluir". Util quando a preventiva foi
// executada antes do modulo de controle existir ou fora do sistema.
export async function registrarExecucaoPassadaService({
  tenantId,
  usuarioId,
  equipamentoId = null,
  unidadePredialId = null,
  tipoServicoPredial = null,
  dataExecucao,
  tecnicoResponsavel = null,
  descricao = null,
}) {
  if (!dataExecucao) {
    return { ok: false, status: 400, message: 'Data da execucao e obrigatoria.' };
  }

  const dataConclusao = new Date(dataExecucao);
  if (Number.isNaN(dataConclusao.getTime())) {
    return { ok: false, status: 400, message: 'Data da execucao invalida.' };
  }

  if (dataConclusao.getTime() > Date.now()) {
    return { ok: false, status: 400, message: 'Nao e possivel registrar execucao no futuro.' };
  }

  // Exclui escolhas ambiguas: tem que ser OU equipamento OU rotina predial,
  // nunca os dois (nem nenhum).
  const ehPredial = !!(unidadePredialId && tipoServicoPredial);
  const ehEquipamento = !!equipamentoId;
  if (ehPredial === ehEquipamento) {
    return {
      ok: false,
      status: 400,
      message: 'Informe equipamentoId OU (unidadePredialId + tipoServicoPredial), nunca ambos.',
    };
  }

  // Valida que o alvo existe neste tenant
  if (ehEquipamento) {
    const eq = await prisma.equipamento.findFirst({
      where: { tenantId, id: equipamentoId },
      select: { id: true, modelo: true, tag: true },
    });
    if (!eq) {
      return { ok: false, status: 404, message: 'Equipamento nao encontrado.' };
    }
  } else {
    const unidade = await prisma.unidade.findFirst({
      where: { tenantId, id: unidadePredialId },
      select: { id: true, nomeSistema: true },
    });
    if (!unidade) {
      return { ok: false, status: 404, message: 'Unidade nao encontrada.' };
    }
  }

  const sequencia = (await contarManutencoesDoTenant(tenantId)) + 1;
  const numeroOS = ehPredial
    ? gerarNumeroOSPredial({ tipo: 'Preventiva', tipoServicoPredial, sequencia })
    : gerarNumeroOS({ tipo: 'Preventiva', tag: 'RETRO', sequencia });

  const descricaoFinal = String(descricao || '').trim()
    || 'Registro retroativo de execucao da rotina preventiva.';

  const nova = await prisma.manutencao.create({
    data: {
      tenant: { connect: { id: tenantId } },
      numeroOS,
      tipo: 'Preventiva',
      status: 'Concluida',
      categoria: ehPredial ? 'Predial' : 'Equipamento',
      ...(ehPredial
        ? { tipoServicoPredial, unidadePredial: { connect: { tenantId_id: { tenantId, id: unidadePredialId } } } }
        : { equipamento: { connect: { tenantId_id: { tenantId, id: equipamentoId } } } }),
      descricaoProblemaServico: descricaoFinal,
      tecnicoResponsavel: tecnicoResponsavel || null,
      origemAbertura: 'registro_retroativo',
      dataConclusao,
      dataFimReal: dataConclusao,
      dataInicioReal: dataConclusao,
    },
    select: {
      id: true,
      numeroOS: true,
      dataConclusao: true,
      categoria: true,
      tipoServicoPredial: true,
      unidadePredialId: true,
      equipamentoId: true,
    },
  });

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'CRIAÇÃO',
    entidade: 'Manutenção',
    entidadeId: nova.id,
    detalhes: `Registro retroativo: ${numeroOS} (${ehPredial ? `predial ${tipoServicoPredial}` : 'equipamento'}) concluida em ${dataConclusao.toISOString()}.`,
  }).catch(() => undefined);

  return { ok: true, data: nova };
}
