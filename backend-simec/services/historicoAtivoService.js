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

function normalizarAnexo(anexo) {
  if (!anexo) return null;

  return {
    id: anexo.id,
    nomeOriginal: anexo.nomeOriginal,
    path: anexo.path,
    tipoMime: anexo.tipoMime || null,
    createdAt: toIsoOrNull(anexo.createdAt),
  };
}

function normalizarNotaAndamento(nota) {
  if (!nota) return null;

  return {
    id: nota.id,
    nota: nota.nota,
    origem: nota.origem || 'manual',
    data: toIsoOrNull(nota.data),
    autor: nota.autor
      ? {
          nome: nota.autor.nome || 'Sistema',
        }
      : null,
  };
}

function normalizarReferenciaManutencao(manutencao) {
  if (!manutencao) return null;

  return {
    id: manutencao.id,
    numeroOS: manutencao.numeroOS,
    tipo: manutencao.tipo,
    status: manutencao.status,
    descricaoProblemaServico: manutencao.descricaoProblemaServico || null,
    tecnicoResponsavel: manutencao.tecnicoResponsavel || null,
    numeroChamado: manutencao.numeroChamado || null,
    dataConclusao: toIsoOrNull(manutencao.dataConclusao),
    dataInicioReal: toIsoOrNull(manutencao.dataInicioReal),
    dataFimReal: toIsoOrNull(manutencao.dataFimReal),
    dataHoraAgendamentoInicio: toIsoOrNull(manutencao.dataHoraAgendamentoInicio),
    dataHoraAgendamentoFim: toIsoOrNull(manutencao.dataHoraAgendamentoFim),
    agendamentoLocal: {
      dataInicio: manutencao.agendamentoDataInicioLocal || null,
      horaInicio: manutencao.agendamentoHoraInicioLocal || null,
      dataFim: manutencao.agendamentoDataFimLocal || null,
      horaFim: manutencao.agendamentoHoraFimLocal || null,
      timezone: manutencao.agendamentoTimezone || null,
    },
    anexos: Array.isArray(manutencao.anexos)
      ? manutencao.anexos.map(normalizarAnexo).filter(Boolean)
      : [],
    notasAndamento: Array.isArray(manutencao.notasAndamento)
      ? manutencao.notasAndamento.map(normalizarNotaAndamento).filter(Boolean)
      : [],
  };
}

function normalizarReferenciaOsCorretiva(os) {
  if (!os) return null;

  return {
    id: os.id,
    numeroOS: os.numeroOS,
    tipo: os.tipo,
    status: os.status,
    solicitante: os.solicitante || null,
    descricaoProblema: os.descricaoProblema || null,
    dataHoraAbertura: toIsoOrNull(os.dataHoraAbertura),
    dataHoraConclusao: toIsoOrNull(os.dataHoraConclusao),
  };
}

function normalizarReferenciaOcorrencia(ocorrencia) {
  if (!ocorrencia) return null;

  return {
    id: ocorrencia.id,
    titulo: ocorrencia.titulo,
    descricao: ocorrencia.descricao || null,
    tipo: ocorrencia.tipo,
    gravidade: ocorrencia.gravidade || null,
    resolvido: Boolean(ocorrencia.resolvido),
    solucao: ocorrencia.solucao || null,
    tecnicoResolucao: ocorrencia.tecnicoResolucao || null,
    data: toIsoOrNull(ocorrencia.data),
    dataResolucao: toIsoOrNull(ocorrencia.dataResolucao),
  };
}

async function carregarReferenciasHistorico(db, eventos = [], tenantId) {
  const manutencaoIds = [
    ...new Set(
      eventos
        .filter((e) => e.referenciaTipo === 'manutencao' && e.referenciaId)
        .map((e) => e.referenciaId)
    ),
  ];

  const ocorrenciaIds = [
    ...new Set(
      eventos
        .filter((e) => e.referenciaTipo === 'ocorrencia' && e.referenciaId)
        .map((e) => e.referenciaId)
    ),
  ];

  const osCorretivaIds = [
    ...new Set(
      eventos
        .filter((e) => e.referenciaTipo === 'os_corretiva' && e.referenciaId)
        .map((e) => e.referenciaId)
    ),
  ];

  const [manutencoes, ocorrencias, osCorretivas] = await Promise.all([
    manutencaoIds.length
      ? db.manutencao.findMany({
          where: {
            tenantId,
            id: {
              in: manutencaoIds,
            },
          },
          select: {
            id: true,
            numeroOS: true,
            tipo: true,
            status: true,
            descricaoProblemaServico: true,
            tecnicoResponsavel: true,
            numeroChamado: true,
            dataConclusao: true,
            dataInicioReal: true,
            dataFimReal: true,
            dataHoraAgendamentoInicio: true,
            dataHoraAgendamentoFim: true,
            agendamentoDataInicioLocal: true,
            agendamentoHoraInicioLocal: true,
            agendamentoDataFimLocal: true,
            agendamentoHoraFimLocal: true,
            agendamentoTimezone: true,
            anexos: {
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                id: true,
                nomeOriginal: true,
                path: true,
                tipoMime: true,
                createdAt: true,
              },
            },
            notasAndamento: {
              where: {
                tenantId,
              },
              orderBy: {
                data: 'desc',
              },
              include: {
                autor: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
          },
        })
      : [],
    ocorrenciaIds.length
      ? db.ocorrencia.findMany({
          where: {
            tenantId,
            id: {
              in: ocorrenciaIds,
            },
          },
          select: {
            id: true,
            titulo: true,
            descricao: true,
            tipo: true,
            gravidade: true,
            resolvido: true,
            solucao: true,
            tecnicoResolucao: true,
            data: true,
            dataResolucao: true,
          },
        })
      : [],
    osCorretivaIds.length
      ? db.osCorretiva.findMany({
          where: { tenantId, id: { in: osCorretivaIds } },
          select: {
            id: true,
            numeroOS: true,
            tipo: true,
            status: true,
            solicitante: true,
            descricaoProblema: true,
            dataHoraAbertura: true,
            dataHoraConclusao: true,
          },
        })
      : [],
  ]);

  return {
    manutencoes: new Map(
      manutencoes.map((m) => [m.id, normalizarReferenciaManutencao(m)])
    ),
    ocorrencias: new Map(
      ocorrencias.map((o) => [o.id, normalizarReferenciaOcorrencia(o)])
    ),
    osCorretivas: new Map(
      osCorretivas.map((os) => [os.id, normalizarReferenciaOsCorretiva(os)])
    ),
  };
}

export function normalizarHistoricoAtivoEvento(evento, referencias = null) {
  const referenciaDetalhes =
    evento.referenciaTipo === 'manutencao'
      ? referencias?.manutencoes?.get(evento.referenciaId) || null
      : evento.referenciaTipo === 'ocorrencia'
      ? referencias?.ocorrencias?.get(evento.referenciaId) || null
      : evento.referenciaTipo === 'os_corretiva'
      ? referencias?.osCorretivas?.get(evento.referenciaId) || null
      : null;

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
    referenciaDetalhes,
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

  const referencias = await carregarReferenciasHistorico(prisma, eventos, tenantId);

  return {
    items: eventos.map((evento) =>
      normalizarHistoricoAtivoEvento(evento, referencias)
    ),
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

  const referencias = await carregarReferenciasHistorico(prisma, eventos, tenantId);

  return eventos.map((evento) =>
    normalizarHistoricoAtivoEvento(evento, referencias)
  );
}
