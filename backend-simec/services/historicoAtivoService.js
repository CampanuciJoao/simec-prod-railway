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
}) {
  const eventos = await prisma.historicoAtivoEvento.findMany({
    where: {
      tenantId,
      equipamentoId,
    },
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
