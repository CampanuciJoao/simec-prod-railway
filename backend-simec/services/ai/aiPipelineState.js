// Centraliza o estado dos pipelines automáticos da IA (kill switch + pausa
// cirúrgica). Workers chamam `estaAtivo(pipeline, tenantId)` antes de cada
// execução; se desligado, registram log e pulam. Toda mudança de estado é
// auditada via LogAuditoria pelos endpoints que chamam pausar/retomar.
//
// Hierarquia de checagem:
//   1. Se "global" estiver pausado → tudo pausado (kill switch).
//   2. Se o pipeline específico estiver pausado para o tenant → pausado.
//   3. Se o pipeline específico estiver pausado globalmente (tenantId NULL) → pausado.
//   4. Caso contrário → ativo.

import prisma from '../prismaService.js';

export const PIPELINE_NAMES = Object.freeze({
  GLOBAL:            'global',
  GEHC_CAPTURA_PDF:  'gehc_captura_pdf',
  GEHC_EXTRACAO_PDF: 'gehc_extracao_pdf',
  KNOWLEDGE_LAYER:   'knowledge_layer',
  IA_EMBEDDINGS:     'ia_embeddings',
  IA_INSIGHTS:       'ia_insights',
});

const PIPELINE_LABELS = Object.freeze({
  global:              'IA (kill switch)',
  gehc_captura_pdf:    'Captura de PDFs GE',
  gehc_extracao_pdf:   'Extração de causa-raiz dos PDFs',
  knowledge_layer:     'Consolidação da memória da IA',
  ia_embeddings:       'Indexação semântica (RAG)',
  ia_insights:         'Geração de insights preditivos',
});

function getLabel(pipeline) {
  return PIPELINE_LABELS[pipeline] || pipeline;
}

async function buscarEstado(pipeline, tenantId) {
  return prisma.aiPipelineEstado.findFirst({
    where: { pipeline, tenantId },
  });
}

/**
 * Retorna true se o pipeline estiver ativo para o tenant em questão.
 * Pipeline "global" desligado tem precedência sobre todos os outros.
 */
export async function estaAtivo(pipeline, tenantId = null) {
  if (pipeline !== PIPELINE_NAMES.GLOBAL) {
    const global = await buscarEstado(PIPELINE_NAMES.GLOBAL, null);
    if (global && !global.ativo) return false;
  }

  if (tenantId) {
    const porTenant = await buscarEstado(pipeline, tenantId);
    if (porTenant) return porTenant.ativo;
  }

  const globalDoPipeline = await buscarEstado(pipeline, null);
  if (globalDoPipeline) return globalDoPipeline.ativo;

  return true; // default: ativo
}

/**
 * Pausa um pipeline. tenantId NULL = pausa global aplicável a todos os tenants.
 */
export async function pausar(pipeline, { tenantId = null, usuarioId, motivo = null } = {}) {
  if (!Object.values(PIPELINE_NAMES).includes(pipeline)) {
    throw new Error(`PIPELINE_INVALIDO: ${pipeline}`);
  }

  const existente = await buscarEstado(pipeline, tenantId);
  const dadosBase = {
    ativo:         false,
    pausadoEm:     new Date(),
    pausadoPorId:  usuarioId || null,
    motivoPausa:   motivo || null,
    retomadoEm:    null,
    retomadoPorId: null,
  };

  if (existente) {
    return prisma.aiPipelineEstado.update({
      where: { id: existente.id },
      data:  dadosBase,
    });
  }

  return prisma.aiPipelineEstado.create({
    data: { tenantId, pipeline, ...dadosBase },
  });
}

/**
 * Retoma um pipeline previamente pausado.
 */
export async function retomar(pipeline, { tenantId = null, usuarioId } = {}) {
  if (!Object.values(PIPELINE_NAMES).includes(pipeline)) {
    throw new Error(`PIPELINE_INVALIDO: ${pipeline}`);
  }

  const existente = await buscarEstado(pipeline, tenantId);

  if (!existente) {
    return prisma.aiPipelineEstado.create({
      data: { tenantId, pipeline, ativo: true },
    });
  }

  return prisma.aiPipelineEstado.update({
    where: { id: existente.id },
    data:  {
      ativo:         true,
      retomadoEm:    new Date(),
      retomadoPorId: usuarioId || null,
    },
  });
}

/**
 * Registra o resultado de uma execucao do pipeline (sucesso ou falha).
 * Workers chamam isso ao final de cada job para que o painel mostre
 * "ultima execucao: ok ha 5 min · 12 PDFs · 32s" sem precisar de logs.
 *
 * Cria a linha do estado se nao existir (mantendo ativo=true por default).
 */
export async function registrarExecucao(pipeline, { ok, mensagem, metrics, duracaoMs, tenantId = null } = {}) {
  if (!Object.values(PIPELINE_NAMES).includes(pipeline)) return;

  const dadosExec = {
    ultimaExecucaoEm:        new Date(),
    ultimaExecucaoOk:        ok === true,
    ultimaExecucaoMensagem:  mensagem ? String(mensagem).slice(0, 500) : null,
    ultimaExecucaoMetrics:   metrics ?? null,
    ultimaExecucaoDuracaoMs: typeof duracaoMs === 'number' ? Math.round(duracaoMs) : null,
  };

  const existente = await buscarEstado(pipeline, tenantId);
  if (existente) {
    await prisma.aiPipelineEstado.update({
      where: { id: existente.id },
      data:  dadosExec,
    });
  } else {
    await prisma.aiPipelineEstado.create({
      data: { tenantId, pipeline, ativo: true, ...dadosExec },
    });
  }
}

/**
 * Lista o estado atual de todos os pipelines conhecidos para um tenant.
 * Inclui a definição mesmo quando não há linha persistida (default: ativo).
 *
 * `escopoVisivel`:
 *   - 'system' (superadmin no Tenant System): ve o pipeline 'global' (kill
 *     switch) e os nomes de quem pausou/retomou globalmente.
 *   - 'tenant' (admin de cliente): NAO ve o pipeline 'global' e quando um
 *     pipeline herda estado do global, os campos pausadoPor/retomadoPor
 *     ficam mascarados como "administrador SIMEC" para nao vazar
 *     identidade cross-tenant.
 */
export async function listarEstados({ tenantId = null, escopoVisivel = 'tenant' } = {}) {
  const linhas = await prisma.aiPipelineEstado.findMany({
    where: { OR: [{ tenantId: null }, { tenantId }] },
    include: {
      pausadoPor:  { select: { id: true, nome: true } },
      retomadoPor: { select: { id: true, nome: true } },
    },
  });

  const porChave = new Map();
  for (const linha of linhas) {
    porChave.set(`${linha.tenantId ?? 'global'}::${linha.pipeline}`, linha);
  }

  const usuarioMascarado = { id: null, nome: 'Administrador SIMEC' };

  const pipelinesVisiveis = escopoVisivel === 'system'
    ? Object.values(PIPELINE_NAMES)
    : Object.values(PIPELINE_NAMES).filter((p) => p !== PIPELINE_NAMES.GLOBAL);

  return pipelinesVisiveis.map((pipeline) => {
    const linhaTenant = tenantId ? porChave.get(`${tenantId}::${pipeline}`) : null;
    const linhaGlobal = porChave.get(`global::${pipeline}`);
    const linha = linhaTenant || linhaGlobal || null;

    const ehHerdadoDoGlobal = !linhaTenant && Boolean(linhaGlobal);
    const mascarar = ehHerdadoDoGlobal && escopoVisivel !== 'system';

    return {
      pipeline,
      label:         getLabel(pipeline),
      ativo:         linha ? linha.ativo : true,
      escopo:        linhaTenant ? 'tenant' : (linhaGlobal ? 'global' : 'default'),
      pausadoEm:     linha?.pausadoEm  || null,
      pausadoPor:    mascarar ? (linha?.pausadoPor ? usuarioMascarado : null) : (linha?.pausadoPor || null),
      motivoPausa:   mascarar ? null : (linha?.motivoPausa || null),
      retomadoEm:    linha?.retomadoEm  || null,
      retomadoPor:   mascarar ? (linha?.retomadoPor ? usuarioMascarado : null) : (linha?.retomadoPor || null),
      // Telemetria da ultima execucao
      ultimaExecucaoEm:        linha?.ultimaExecucaoEm        || null,
      ultimaExecucaoOk:        linha?.ultimaExecucaoOk        ?? null,
      ultimaExecucaoMensagem:  mascarar ? null : (linha?.ultimaExecucaoMensagem  || null),
      ultimaExecucaoMetrics:   mascarar ? null : (linha?.ultimaExecucaoMetrics   || null),
      ultimaExecucaoDuracaoMs: linha?.ultimaExecucaoDuracaoMs ?? null,
    };
  });
}
