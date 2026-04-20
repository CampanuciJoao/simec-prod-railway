import prisma from './prismaService.js';

function parseMetadata(metadataJson) {
  if (!metadataJson) return null;

  try {
    return JSON.parse(metadataJson);
  } catch {
    return null;
  }
}

function toIsoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizarHistoricoAtivoEvento(evento) {
  return {
    id: evento.id,
    tenantId: evento.tenantId,
    equipamentoId: evento.equipamentoId,
    tipoEvento: evento.tipoEvento,
    categoria: evento.categoria,
    subcategoria: evento.subcategoria || null,
    titulo: evento.titulo,
    descricao: evento.descricao || null,
    origem: evento.origem || 'sistema',
    status: evento.status || null,
    impactaAnalise: Boolean(evento.impactaAnalise),
    referenciaId: evento.referenciaId || null,
    referenciaTipo: evento.referenciaTipo || null,
    metadata: parseMetadata(evento.metadataJson),
    dataEvento: toIsoOrNull(evento.dataEvento) || toIsoOrNull(evento.createdAt),
    createdAt: toIsoOrNull(evento.createdAt),
  };
}

function buildHistoricoWhereClause({
  tenantId,
  equipamentoId,
  categoria = null,
  subcategoria = null,
  dataInicio = null,
  dataFim = null,
}) {
  const where = {
    tenantId,
    equipamentoId,
  };

  if (categoria) {
    where.categoria = categoria;
  }

  if (subcategoria) {
    where.subcategoria = subcategoria;
  }

  if (dataInicio || dataFim) {
    where.dataEvento = {};

    if (dataInicio) {
      where.dataEvento.gte = new Date(`${dataInicio}T00:00:00.000Z`);
    }

    if (dataFim) {
      where.dataEvento.lte = new Date(`${dataFim}T23:59:59.999Z`);
    }
  }

  return where;
}

export async function registrarEventoHistoricoAtivo({
  db = prisma,
  tenantId,
  equipamentoId,
  tipoEvento,
  categoria,
  subcategoria = null,
  titulo,
  descricao = null,
  origem = 'sistema',
  status = null,
  impactaAnalise = false,
  referenciaId = null,
  referenciaTipo = null,
  metadata = null,
  dataEvento = null,
}) {
  const payload = {
    tenant: {
      connect: { id: tenantId },
    },
    equipamento: {
      connect: { id: equipamentoId },
    },
    tipoEvento,
    categoria,
    subcategoria,
    titulo,
    descricao,
    origem,
    status,
    impactaAnalise,
    referenciaId,
    referenciaTipo,
    metadataJson: metadata ? JSON.stringify(metadata) : null,
    ...(dataEvento ? { dataEvento } : {}),
  };

  return db.historicoAtivoEvento.create({
    data: payload,
  });
}

export async function listarHistoricoAtivoPorEquipamento({
  tenantId,
  equipamentoId,
  categoria = null,
  subcategoria = null,
  dataInicio = null,
  dataFim = null,
  limit = 20,
  offset = 0,
}) {
  const where = buildHistoricoWhereClause({
    tenantId,
    equipamentoId,
    categoria,
    subcategoria,
    dataInicio,
    dataFim,
  });

  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const [eventos, total] = await Promise.all([
    prisma.historicoAtivoEvento.findMany({
      where,
      orderBy: [
        {
          dataEvento: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: safeLimit,
      skip: safeOffset,
    }),
    prisma.historicoAtivoEvento.count({ where }),
  ]);

  if (total === 0) {
    return listarHistoricoLegadoPorEquipamento({
      tenantId,
      equipamentoId,
      categoria,
      subcategoria,
      dataInicio,
      dataFim,
      limit: safeLimit,
      offset: safeOffset,
    });
  }

  return {
    items: eventos.map(normalizarHistoricoAtivoEvento),
    total,
    limit: safeLimit,
    offset: safeOffset,
    hasMore: safeOffset + eventos.length < total,
    nextOffset: safeOffset + eventos.length,
    fonte: 'historico_ativo',
  };
}

export async function exportarHistoricoAtivoPorEquipamento({
  tenantId,
  equipamentoId,
  categoria = null,
  subcategoria = null,
  dataInicio = null,
  dataFim = null,
}) {
  const where = buildHistoricoWhereClause({
    tenantId,
    equipamentoId,
    categoria,
    subcategoria,
    dataInicio,
    dataFim,
  });

  const eventos = await prisma.historicoAtivoEvento.findMany({
    where,
    orderBy: [
      {
        dataEvento: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });

  return eventos.map(normalizarHistoricoAtivoEvento);
}
