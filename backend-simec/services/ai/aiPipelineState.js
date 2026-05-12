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
 * Lista o estado atual de todos os pipelines conhecidos para um tenant.
 * Inclui a definição mesmo quando não há linha persistida (default: ativo).
 */
export async function listarEstados({ tenantId = null } = {}) {
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

  return Object.values(PIPELINE_NAMES).map((pipeline) => {
    const linhaTenant = tenantId ? porChave.get(`${tenantId}::${pipeline}`) : null;
    const linhaGlobal = porChave.get(`global::${pipeline}`);
    const linha = linhaTenant || linhaGlobal || null;

    return {
      pipeline,
      label:         getLabel(pipeline),
      ativo:         linha ? linha.ativo : true,
      escopo:        linhaTenant ? 'tenant' : (linhaGlobal ? 'global' : 'default'),
      pausadoEm:     linha?.pausadoEm  || null,
      pausadoPor:    linha?.pausadoPor || null,
      motivoPausa:   linha?.motivoPausa || null,
      retomadoEm:    linha?.retomadoEm  || null,
      retomadoPor:   linha?.retomadoPor || null,
    };
  });
}
