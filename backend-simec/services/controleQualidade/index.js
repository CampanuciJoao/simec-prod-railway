// Service principal do modulo Controle de Qualidade.
// Orquestra: validacao -> repository -> evento historico -> alertas.

import prisma from '../prismaService.js';
import { registrarLog } from '../logService.js';
import { registrarEventoHistoricoAtivo } from '../historicoAtivoService.js';
import { enfileirarReprocessamentoAlertasDoTenant } from '../queueService.js';
import {
  testeCreateSchema,
  testeUpdateSchema,
  testeDeleteSchema,
} from '../../validators/controleQualidadeValidator.js';

import {
  buscarTestePorId,
  buscarTipoPorId,
  criarTeste,
  atualizarTeste,
  softDeleteTeste,
  restaurarTeste,
  listarTestes,
  listarTestesDoEquipamento,
  listarVencimentosAtivosDoEquipamento,
  calcularDashboard,
  listarEquipamentosSemPrograma,
} from './controleQualidadeRepository.js';

// Modalidades reguladas pela RDC 611 (com obrigatoriedade de programa).
export const MODALIDADES_REGULADAS_RDC611 = [
  'Mamografia',
  'Tomografia Computadorizada',
  'Raio-X',
  'Densitometro Osseo',
];

export const MODALIDADES_RECOMENDADAS = [
  'Ressonancia Magnetica',
  'Ressonância Magnética',
  'Ultrassom',
  'Ultrassonografia',
];

export const MODALIDADES_COM_CQ = [
  ...MODALIDADES_REGULADAS_RDC611,
  ...MODALIDADES_RECOMENDADAS,
];

export function calcularProximoVencimento(dataExecucao, frequenciaDias) {
  const d = new Date(dataExecucao);
  d.setDate(d.getDate() + Number(frequenciaDias));
  return d;
}

function reprocessarAlertasAsync(tenantId) {
  void enfileirarReprocessamentoAlertasDoTenant(tenantId, 'controle_qualidade_alterado').catch(() => {});
}

// ─── Listagem geral ─────────────────────────────────────────────────────────

export async function listarTestesService({ tenantId, filtros = {} }) {
  return listarTestes({
    tenantId,
    equipamentoId:    filtros.equipamentoId || null,
    tipoTesteId:      filtros.tipoTesteId || null,
    modalidade:       filtros.modalidade || null,
    resultado:        filtros.resultado || null,
    vencendoEmDias:   filtros.vencendoEmDias != null ? Number(filtros.vencendoEmDias) : null,
    vencidos:         filtros.vencidos === 'true' || filtros.vencidos === true,
    incluirDeletados: filtros.incluirDeletados === 'true' || filtros.incluirDeletados === true,
    page:             filtros.page ? Number(filtros.page) : 1,
    pageSize:         filtros.pageSize ? Math.min(Number(filtros.pageSize), 100) : 25,
  });
}

export async function obterTesteService({ tenantId, testeId }) {
  const teste = await buscarTestePorId({ tenantId, testeId });
  if (!teste) return { ok: false, status: 404, message: 'Teste nao encontrado.' };
  return { ok: true, data: teste };
}

export async function listarTestesDoEquipamentoService({ tenantId, equipamentoId }) {
  // Agrupa por tipoTesteId: 'atual' = mais recente, 'historico' = anteriores.
  const todos = await listarTestesDoEquipamento({ tenantId, equipamentoId });
  const grupos = new Map();
  for (const t of todos) {
    if (!grupos.has(t.tipoTesteId)) {
      grupos.set(t.tipoTesteId, { tipoTeste: t.tipoTeste, atual: t, historico: [] });
    } else {
      grupos.get(t.tipoTesteId).historico.push(t);
    }
  }
  return { ok: true, data: Array.from(grupos.values()) };
}

// ─── Criar (registro de execucao) ───────────────────────────────────────────

export async function criarTesteService({ tenantId, usuarioId, dados }) {
  const v = testeCreateSchema.safeParse(dados);
  if (!v.success) {
    const fieldErrors = {};
    for (const issue of v.error.issues) {
      if (issue.path?.[0]) fieldErrors[issue.path[0]] = issue.message;
    }
    return { ok: false, status: 400, message: 'Dados invalidos.', fieldErrors };
  }

  const equipamento = await prisma.equipamento.findFirst({
    where: { tenantId, id: v.data.equipamentoId },
  });
  if (!equipamento) return { ok: false, status: 404, message: 'Equipamento nao encontrado.' };

  const tipo = await buscarTipoPorId({ tenantId, tipoId: v.data.tipoTesteId });
  if (!tipo) return { ok: false, status: 404, message: 'Tipo de teste nao encontrado.' };
  if (!tipo.ativo) return { ok: false, status: 422, message: 'Tipo de teste esta desativado.' };

  // Valida que a modalidade do tipo bate com o equipamento (alerta apenas;
  // permite registrar casos atipicos com warning no log).
  if (tipo.modalidade !== equipamento.tipo) {
    console.warn(
      `[CQ] Modalidade do tipo "${tipo.modalidade}" diverge do equipamento "${equipamento.tipo}" (eq=${equipamento.id}). Registrando assim mesmo.`
    );
  }

  const dataExecucao = new Date(v.data.dataExecucao);
  const frequenciaEfetiva = v.data.validadeMeses
    ? Number(v.data.validadeMeses) * 30
    : tipo.frequenciaDias;
  const proximoVencimento = calcularProximoVencimento(dataExecucao, frequenciaEfetiva);

  const teste = await criarTeste({
    tenantId,
    autorRegistroId: usuarioId,
    dados: {
      equipamentoId: v.data.equipamentoId,
      tipoTesteId: v.data.tipoTesteId,
      dataExecucao,
      proximoVencimento,
      resultado: v.data.resultado,
      numeroLaudo: v.data.numeroLaudo,
      empresaExecutora: v.data.empresaExecutora,
      responsavelNome: v.data.responsavelNome,
      responsavelRegistro: v.data.responsavelRegistro,
      validadeMeses: v.data.validadeMeses,
      observacoes: v.data.observacoes,
      pendenciasAcao: (v.data.pendenciasAcao ?? []).map((p) => ({
        descricao: p.descricao,
        resolvido: p.resolvido ?? false,
        criadoEm: p.criadoEm ?? new Date().toISOString(),
        ...(p.dataResolucao ? { dataResolucao: p.dataResolucao } : {}),
        ...(p.observacao ? { observacao: p.observacao } : {}),
        ...(p.resolvidoPor ? { resolvidoPor: p.resolvidoPor } : {}),
      })),
    },
  });

  // Evento no historico do ativo
  const tipoEvento = v.data.resultado === 'Reprovado'
    ? 'teste_qualidade_reprovado'
    : 'teste_qualidade_executado';
  const titulo = `${tipo.nome} - ${v.data.resultado}`;
  await registrarEventoHistoricoAtivo({
    tenantId,
    equipamentoId: v.data.equipamentoId,
    tipoEvento,
    categoria: 'controle_qualidade',
    subcategoria: tipo.modalidade,
    titulo,
    descricao: v.data.observacoes
      || `Teste ${tipo.codigo} executado em ${dataExecucao.toISOString().slice(0,10)}.`,
    origem: 'usuario',
    status: v.data.resultado,
    impactaAnalise: v.data.resultado === 'Reprovado',
    referenciaId: teste.id,
    referenciaTipo: 'teste_qualidade',
    metadata: {
      tipoTesteCodigo: tipo.codigo,
      numeroLaudo: v.data.numeroLaudo || null,
      empresaExecutora: v.data.empresaExecutora || null,
      responsavelNome: v.data.responsavelNome || null,
      proximoVencimento: proximoVencimento.toISOString(),
    },
    dataEvento: dataExecucao,
  });

  await registrarLog({
    tenantId, usuarioId,
    acao: 'CRIACAO',
    entidade: 'TesteQualidade',
    entidadeId: teste.id,
    detalhes: `Teste ${tipo.codigo} (${tipo.nome}) registrado para equipamento ${equipamento.tag} - resultado: ${v.data.resultado}.`,
  });

  reprocessarAlertasAsync(tenantId);
  return { ok: true, status: 201, data: teste };
}

// ─── Atualizar ──────────────────────────────────────────────────────────────

export async function atualizarTesteService({ tenantId, usuarioId, testeId, dados }) {
  const teste = await buscarTestePorId({ tenantId, testeId });
  if (!teste) return { ok: false, status: 404, message: 'Teste nao encontrado.' };

  const v = testeUpdateSchema.safeParse(dados);
  if (!v.success) {
    const fieldErrors = {};
    for (const issue of v.error.issues) {
      if (issue.path?.[0]) fieldErrors[issue.path[0]] = issue.message;
    }
    return { ok: false, status: 400, message: 'Dados invalidos.', fieldErrors };
  }

  // Recalcula proximoVencimento se mudou dataExecucao ou validadeMeses
  let proximoVencimento;
  if (v.data.dataExecucao || v.data.validadeMeses != null) {
    const novaDataExecucao = v.data.dataExecucao
      ? new Date(v.data.dataExecucao)
      : teste.dataExecucao;
    const validadeMesesEfetiva = v.data.validadeMeses != null
      ? v.data.validadeMeses
      : teste.validadeMeses;
    const frequenciaEfetiva = validadeMesesEfetiva
      ? Number(validadeMesesEfetiva) * 30
      : teste.tipoTeste.frequenciaDias;
    proximoVencimento = calcularProximoVencimento(novaDataExecucao, frequenciaEfetiva);
  }

  const atualizado = await atualizarTeste({
    tenantId,
    testeId,
    dados: {
      ...(v.data.dataExecucao !== undefined ? { dataExecucao: new Date(v.data.dataExecucao) } : {}),
      ...(proximoVencimento !== undefined ? { proximoVencimento } : {}),
      ...(v.data.resultado !== undefined ? { resultado: v.data.resultado } : {}),
      ...(v.data.numeroLaudo !== undefined ? { numeroLaudo: v.data.numeroLaudo } : {}),
      ...(v.data.empresaExecutora !== undefined ? { empresaExecutora: v.data.empresaExecutora } : {}),
      ...(v.data.responsavelNome !== undefined ? { responsavelNome: v.data.responsavelNome } : {}),
      ...(v.data.responsavelRegistro !== undefined ? { responsavelRegistro: v.data.responsavelRegistro } : {}),
      ...(v.data.validadeMeses !== undefined ? { validadeMeses: v.data.validadeMeses } : {}),
      ...(v.data.observacoes !== undefined ? { observacoes: v.data.observacoes } : {}),
      ...(v.data.pendenciasAcao !== undefined ? { pendenciasAcao: v.data.pendenciasAcao } : {}),
    },
  });

  await registrarLog({
    tenantId, usuarioId,
    acao: 'EDICAO',
    entidade: 'TesteQualidade',
    entidadeId: testeId,
    detalhes: `Teste ${teste.tipoTeste.codigo} editado.`,
  });

  reprocessarAlertasAsync(tenantId);
  return { ok: true, data: atualizado };
}

// ─── Soft delete com justificativa ──────────────────────────────────────────

export async function excluirTesteService({ tenantId, usuarioId, testeId, dados }) {
  const teste = await buscarTestePorId({ tenantId, testeId });
  if (!teste) return { ok: false, status: 404, message: 'Teste nao encontrado.' };

  const v = testeDeleteSchema.safeParse(dados);
  if (!v.success) {
    const fieldErrors = {};
    for (const issue of v.error.issues) {
      if (issue.path?.[0]) fieldErrors[issue.path[0]] = issue.message;
    }
    return { ok: false, status: 400, message: 'Justificativa invalida.', fieldErrors };
  }

  await softDeleteTeste({
    tenantId, testeId,
    deletadoPorId: usuarioId,
    motivoExclusao: v.data.motivoExclusao.trim(),
  });

  await registrarLog({
    tenantId, usuarioId,
    acao: 'EXCLUSAO',
    entidade: 'TesteQualidade',
    entidadeId: testeId,
    detalhes: `Teste ${teste.tipoTeste.codigo} excluido (soft). Motivo: ${v.data.motivoExclusao.trim()}`,
  });

  reprocessarAlertasAsync(tenantId);
  return { ok: true, data: { id: testeId } };
}

export async function restaurarTesteService({ tenantId, usuarioId, testeId }) {
  const teste = await buscarTestePorId({ tenantId, testeId, incluirDeletado: true });
  if (!teste) return { ok: false, status: 404, message: 'Teste nao encontrado.' };
  if (!teste.deletadoEm) return { ok: false, status: 422, message: 'Teste nao esta excluido.' };

  await restaurarTeste({ tenantId, testeId });

  await registrarLog({
    tenantId, usuarioId,
    acao: 'EDICAO',
    entidade: 'TesteQualidade',
    entidadeId: testeId,
    detalhes: `Teste ${teste.tipoTeste.codigo} restaurado.`,
  });

  reprocessarAlertasAsync(tenantId);
  return { ok: true, data: { id: testeId } };
}

// ─── Pendencias do laudo ────────────────────────────────────────────────────

export async function atualizarPendenciaService({ tenantId, usuarioId, testeId, indice, dados }) {
  const teste = await buscarTestePorId({ tenantId, testeId });
  if (!teste) return { ok: false, status: 404, message: 'Teste nao encontrado.' };

  const pendencias = Array.isArray(teste.pendenciasAcao) ? [...teste.pendenciasAcao] : [];
  const i = Number(indice);
  if (!Number.isInteger(i) || i < 0 || i >= pendencias.length) {
    return { ok: false, status: 404, message: 'Pendencia nao encontrada.' };
  }

  pendencias[i] = {
    ...pendencias[i],
    resolvido: dados.resolvido,
    ...(dados.resolvido
      ? {
          dataResolucao: new Date().toISOString(),
          resolvidoPor: usuarioId,
          ...(dados.observacao ? { observacao: dados.observacao } : {}),
        }
      : { dataResolucao: undefined, resolvidoPor: undefined }),
  };

  const atualizado = await atualizarTeste({ tenantId, testeId, dados: { pendenciasAcao: pendencias } });

  await registrarLog({
    tenantId, usuarioId,
    acao: 'EDICAO',
    entidade: 'TesteQualidade',
    entidadeId: testeId,
    detalhes: `Pendencia #${i} ${dados.resolvido ? 'resolvida' : 'reaberta'}: "${pendencias[i].descricao}".`,
  });

  return { ok: true, data: atualizado };
}

export async function adicionarPendenciaService({ tenantId, usuarioId, testeId, dados }) {
  const teste = await buscarTestePorId({ tenantId, testeId });
  if (!teste) return { ok: false, status: 404, message: 'Teste nao encontrado.' };

  const pendencias = Array.isArray(teste.pendenciasAcao) ? [...teste.pendenciasAcao] : [];
  pendencias.push({
    descricao: dados.descricao,
    resolvido: false,
    criadoEm: new Date().toISOString(),
  });

  const atualizado = await atualizarTeste({ tenantId, testeId, dados: { pendenciasAcao: pendencias } });

  await registrarLog({
    tenantId, usuarioId,
    acao: 'EDICAO',
    entidade: 'TesteQualidade',
    entidadeId: testeId,
    detalhes: `Pendencia adicionada: "${dados.descricao}".`,
  });

  return { ok: true, status: 201, data: atualizado };
}

// ─── Programa do equipamento (ativacao em lote) ─────────────────────────────

export async function ativarProgramaService({ tenantId, usuarioId, equipamentoId, codigos = null }) {
  const equipamento = await prisma.equipamento.findFirst({
    where: { tenantId, id: equipamentoId },
  });
  if (!equipamento) return { ok: false, status: 404, message: 'Equipamento nao encontrado.' };

  const where = {
    tenantId,
    ativo: true,
    modalidade: equipamento.tipo,
    ...(codigos && codigos.length ? { codigo: { in: codigos } } : { obrigatorio: true }),
  };
  const tipos = await prisma.tipoTesteQualidade.findMany({ where });

  if (tipos.length === 0) {
    return {
      ok: false,
      status: 422,
      message: `Nenhum tipo de teste obrigatorio cadastrado para a modalidade "${equipamento.tipo}".`,
    };
  }

  const baseData = equipamento.dataInstalacao || new Date();

  // Pula tipos que ja tem registro ativo para este equipamento (evita duplicar
  // ao ativar programa multiplas vezes).
  const existentes = await prisma.testeQualidade.findMany({
    where: { tenantId, equipamentoId, deletadoEm: null, tipoTesteId: { in: tipos.map((t) => t.id) } },
    select: { tipoTesteId: true },
  });
  const idsExistentes = new Set(existentes.map((e) => e.tipoTesteId));

  const criados = [];
  for (const tipo of tipos) {
    if (idsExistentes.has(tipo.id)) continue;
    const proximoVencimento = calcularProximoVencimento(baseData, tipo.frequenciaDias);
    const t = await prisma.testeQualidade.create({
      data: {
        tenantId,
        equipamentoId,
        tipoTesteId: tipo.id,
        dataExecucao: null,
        proximoVencimento,
        resultado: null,
      },
    });
    criados.push(t);
  }

  if (criados.length > 0) {
    await registrarLog({
      tenantId, usuarioId,
      acao: 'CRIACAO',
      entidade: 'TesteQualidade',
      entidadeId: equipamentoId,
      detalhes: `Programa CQ ativado para ${equipamento.tag}: ${criados.length} testes criados (modalidade ${equipamento.tipo}).`,
    });
    reprocessarAlertasAsync(tenantId);
  }

  return { ok: true, data: { criados: criados.length, jaExistentes: idsExistentes.size } };
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function dashboardService({ tenantId }) {
  const kpis = await calcularDashboard({ tenantId });
  const semPrograma = await listarEquipamentosSemPrograma({ tenantId, modalidades: MODALIDADES_REGULADAS_RDC611 });
  return { ok: true, data: { ...kpis, semPrograma: semPrograma.length, equipamentosSemPrograma: semPrograma } };
}

// ─── Calculo de cqStatus por equipamento (usado em GET /equipamentos) ───────
// Retorna mapa equipamentoId -> 'reprovado'|'vencido'|'vencendo'|'pendencias_abertas'|'ok'
export async function calcularCqStatusBatch({ tenantId, equipamentoIds }) {
  if (!equipamentoIds?.length) return new Map();

  const agora = new Date();
  const em30d = new Date();
  em30d.setDate(em30d.getDate() + 30);

  const testes = await prisma.testeQualidade.findMany({
    where: {
      tenantId,
      equipamentoId: { in: equipamentoIds },
      deletadoEm: null,
    },
    select: {
      equipamentoId: true,
      tipoTesteId: true,
      dataExecucao: true,
      proximoVencimento: true,
      resultado: true,
      pendenciasAcao: true,
    },
  });

  // Agrupa por equipamento e por tipo (mais recente)
  const porEqEPorTipo = new Map(); // eqId -> Map(tipoId -> teste)
  for (const t of testes) {
    if (!porEqEPorTipo.has(t.equipamentoId)) porEqEPorTipo.set(t.equipamentoId, new Map());
    const mapa = porEqEPorTipo.get(t.equipamentoId);
    const existente = mapa.get(t.tipoTesteId);
    const novaEhMaisRecente =
      !existente ||
      (t.dataExecucao && (!existente.dataExecucao || new Date(t.dataExecucao) > new Date(existente.dataExecucao)));
    if (novaEhMaisRecente) mapa.set(t.tipoTesteId, t);
  }

  const resultado = new Map();
  for (const eqId of equipamentoIds) {
    const mapa = porEqEPorTipo.get(eqId);
    if (!mapa || mapa.size === 0) {
      resultado.set(eqId, 'ok');
      continue;
    }
    let status = 'ok';
    for (const teste of mapa.values()) {
      // Reprovado vence tudo
      if (teste.resultado === 'Reprovado') { status = 'reprovado'; break; }
      if (teste.proximoVencimento) {
        if (new Date(teste.proximoVencimento) < agora) {
          if (status !== 'reprovado') status = 'vencido';
          continue;
        }
        if (new Date(teste.proximoVencimento) <= em30d && status === 'ok') {
          status = 'vencendo';
        }
      }
      // Pendencias abertas (nao sobrescreve niveis maiores)
      if (status === 'ok' && Array.isArray(teste.pendenciasAcao)) {
        const abertas = teste.pendenciasAcao.filter((p) => !p.resolvido).length;
        if (abertas > 0) status = 'pendencias_abertas';
      }
    }
    resultado.set(eqId, status);
  }
  return resultado;
}

export {
  listarVencimentosAtivosDoEquipamento,
};
