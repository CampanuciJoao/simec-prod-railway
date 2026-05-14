// Queries Prisma do modulo Controle de Qualidade.
// Encapsula acesso ao banco (testesQualidade + tiposTesteQualidade).

import prisma from '../prismaService.js';

// ─── Tipos de teste (catalogo) ──────────────────────────────────────────────

export function listarTipos({ tenantId, modalidade = null, somenteAtivos = true } = {}) {
  return prisma.tipoTesteQualidade.findMany({
    where: {
      tenantId,
      ...(somenteAtivos ? { ativo: true } : {}),
      ...(modalidade ? { modalidade } : {}),
    },
    orderBy: [{ modalidade: 'asc' }, { nome: 'asc' }],
  });
}

export function buscarTipoPorId({ tenantId, tipoId }) {
  return prisma.tipoTesteQualidade.findFirst({
    where: { id: tipoId, tenantId },
  });
}

export function buscarTipoPorCodigo({ tenantId, codigo }) {
  return prisma.tipoTesteQualidade.findUnique({
    where: { tenantId_codigo: { tenantId, codigo } },
  });
}

export function criarTipo({ tenantId, dados }) {
  return prisma.tipoTesteQualidade.create({
    data: {
      tenantId,
      codigo:            dados.codigo,
      nome:              dados.nome,
      modalidade:        dados.modalidade,
      frequenciaDias:    dados.frequenciaDias,
      obrigatorio:       dados.obrigatorio ?? false,
      normaReferencia:   dados.normaReferencia ?? null,
      responsavelTipico: dados.responsavelTipico ?? null,
      descricao:         dados.descricao ?? null,
      ativo:             dados.ativo ?? true,
    },
  });
}

export function atualizarTipo({ tenantId, tipoId, dados }) {
  return prisma.tipoTesteQualidade.update({
    where: { id: tipoId },
    data: {
      ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
      ...(dados.modalidade !== undefined ? { modalidade: dados.modalidade } : {}),
      ...(dados.frequenciaDias !== undefined ? { frequenciaDias: dados.frequenciaDias } : {}),
      ...(dados.obrigatorio !== undefined ? { obrigatorio: dados.obrigatorio } : {}),
      ...(dados.normaReferencia !== undefined ? { normaReferencia: dados.normaReferencia } : {}),
      ...(dados.responsavelTipico !== undefined ? { responsavelTipico: dados.responsavelTipico } : {}),
      ...(dados.descricao !== undefined ? { descricao: dados.descricao } : {}),
      ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
    },
  });
}

// ─── Execucoes de teste ─────────────────────────────────────────────────────

const TESTE_INCLUDE = {
  tipoTeste: true,
  equipamento: { select: { id: true, tag: true, apelido: true, modelo: true, tipo: true } },
  anexos: true,
  autorRegistro: { select: { id: true, nome: true } },
  deletadoPor: { select: { id: true, nome: true } },
};

export function listarTestes({
  tenantId,
  equipamentoId = null,
  tipoTesteId = null,
  modalidade = null,
  resultado = null,
  vencendoEmDias = null,
  vencidos = null,
  incluirDeletados = false,
  page = 1,
  pageSize = 25,
}) {
  const where = { tenantId };
  if (!incluirDeletados) where.deletadoEm = null;
  if (equipamentoId) where.equipamentoId = equipamentoId;
  if (tipoTesteId) where.tipoTesteId = tipoTesteId;
  if (resultado) where.resultado = resultado;
  if (modalidade) where.tipoTeste = { modalidade };

  if (vencidos === true) {
    where.proximoVencimento = { lt: new Date() };
  } else if (vencendoEmDias != null) {
    const limite = new Date();
    limite.setDate(limite.getDate() + Number(vencendoEmDias));
    where.proximoVencimento = { gte: new Date(), lte: limite };
  }

  return Promise.all([
    prisma.testeQualidade.findMany({
      where,
      include: TESTE_INCLUDE,
      orderBy: [{ dataExecucao: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.testeQualidade.count({ where }),
  ]).then(([items, total]) => ({ items, total, page, pageSize }));
}

export function buscarTestePorId({ tenantId, testeId, incluirDeletado = false }) {
  return prisma.testeQualidade.findFirst({
    where: {
      id: testeId,
      tenantId,
      ...(incluirDeletado ? {} : { deletadoEm: null }),
    },
    include: TESTE_INCLUDE,
  });
}

export function listarTestesDoEquipamento({ tenantId, equipamentoId }) {
  return prisma.testeQualidade.findMany({
    where: { tenantId, equipamentoId, deletadoEm: null },
    include: TESTE_INCLUDE,
    orderBy: [{ dataExecucao: 'desc' }, { createdAt: 'desc' }],
  });
}

// Para um equipamento, retorna o registro mais recente por (tipoTesteId).
// Eh a base do "vencimento ativo".
export async function listarVencimentosAtivosDoEquipamento({ tenantId, equipamentoId }) {
  const todos = await prisma.testeQualidade.findMany({
    where: {
      tenantId,
      equipamentoId,
      deletadoEm: null,
      dataExecucao: { not: null },
    },
    include: { tipoTeste: true },
    orderBy: { dataExecucao: 'desc' },
  });

  const maisRecentePorTipo = new Map();
  for (const t of todos) {
    if (!maisRecentePorTipo.has(t.tipoTesteId)) {
      maisRecentePorTipo.set(t.tipoTesteId, t);
    }
  }
  return Array.from(maisRecentePorTipo.values());
}

export function criarTeste({ tenantId, dados, autorRegistroId }) {
  return prisma.testeQualidade.create({
    data: {
      tenantId,
      equipamentoId:       dados.equipamentoId,
      tipoTesteId:         dados.tipoTesteId,
      dataExecucao:        dados.dataExecucao,
      proximoVencimento:   dados.proximoVencimento,
      resultado:           dados.resultado,
      numeroLaudo:         dados.numeroLaudo ?? null,
      empresaExecutora:    dados.empresaExecutora ?? null,
      responsavelNome:     dados.responsavelNome ?? null,
      responsavelRegistro: dados.responsavelRegistro ?? null,
      validadeMeses:       dados.validadeMeses ?? null,
      observacoes:         dados.observacoes ?? null,
      pendenciasAcao:      dados.pendenciasAcao ?? null,
      autorRegistroId:     autorRegistroId ?? null,
    },
    include: TESTE_INCLUDE,
  });
}

// Cria registro "fantasma" (programa ativado mas sem execucao real ainda).
export function criarTesteFantasma({ tenantId, equipamentoId, tipoTesteId, proximoVencimento }) {
  return prisma.testeQualidade.create({
    data: {
      tenantId,
      equipamentoId,
      tipoTesteId,
      dataExecucao: null,
      proximoVencimento,
      resultado: null,
    },
  });
}

export function atualizarTeste({ tenantId, testeId, dados }) {
  return prisma.testeQualidade.update({
    where: { id: testeId },
    data: dados,
    include: TESTE_INCLUDE,
  });
}

export function softDeleteTeste({ tenantId, testeId, deletadoPorId, motivoExclusao }) {
  return prisma.testeQualidade.update({
    where: { id: testeId },
    data: {
      deletadoEm: new Date(),
      deletadoPorId,
      motivoExclusao,
    },
  });
}

export function restaurarTeste({ tenantId, testeId }) {
  return prisma.testeQualidade.update({
    where: { id: testeId },
    data: {
      deletadoEm: null,
      deletadoPorId: null,
      motivoExclusao: null,
    },
  });
}

// KPIs do dashboard
export async function calcularDashboard({ tenantId }) {
  const agora = new Date();
  const em30Dias = new Date();
  em30Dias.setDate(em30Dias.getDate() + 30);

  const [aprovados, reprovados, vencendo30d, vencidos, totalAtivos] = await Promise.all([
    prisma.testeQualidade.count({
      where: { tenantId, deletadoEm: null, resultado: 'Aprovado' },
    }),
    prisma.testeQualidade.count({
      where: { tenantId, deletadoEm: null, resultado: 'Reprovado' },
    }),
    prisma.testeQualidade.count({
      where: {
        tenantId,
        deletadoEm: null,
        proximoVencimento: { gte: agora, lte: em30Dias },
      },
    }),
    prisma.testeQualidade.count({
      where: {
        tenantId,
        deletadoEm: null,
        proximoVencimento: { lt: agora },
      },
    }),
    prisma.testeQualidade.count({
      where: { tenantId, deletadoEm: null },
    }),
  ]);

  return {
    total: totalAtivos,
    aprovados,
    reprovados,
    vencendo30d,
    vencidos,
  };
}

// Equipamentos da modalidade regulada que NAO tem programa ativo (nenhum
// registro de teste cadastrado).
export async function listarEquipamentosSemPrograma({ tenantId, modalidades }) {
  return prisma.equipamento.findMany({
    where: {
      tenantId,
      tipo: { in: modalidades },
      status: { notIn: ['Vendido', 'Desativado'] },
      testesQualidade: { none: { deletadoEm: null } },
    },
    select: { id: true, tag: true, apelido: true, modelo: true, tipo: true },
  });
}
