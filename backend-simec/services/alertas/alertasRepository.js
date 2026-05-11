import prisma from '../prismaService.js';

// Busca o ponto de corte temporal a partir do qual alertas passam a aparecer
// no feed do usuario. Alertas com data anterior a este timestamp sao considerados
// historicos do tenant e nao contam como "nao visto" para usuarios recem-criados.
// Ver ADR-014 (ciclo de vida de alertas e baseline por usuario).
export async function buscarBaselineNotificacoes({ tenantId, userId }) {
  const usuario = await prisma.usuario.findFirst({
    where: { id: userId, tenantId },
    select: { notificacoesBaselineEm: true },
  });
  return usuario?.notificacoesBaselineEm || null;
}

function buildAlertaWhere({ tenantId, userId, baseline, filtros = {} }) {
  const where = { tenantId };

  // Baseline por usuario: so aplicado quando o chamador nao pede explicitamente
  // o historico anterior. Mantem o feed enxuto para usuarios recem-criados sem
  // esconder o acervo de quem quiser auditar.
  if (baseline && !filtros.incluirHistorico) {
    where.data = { gte: baseline };
  }

  if (filtros.status === 'NaoVisto') {
    where.NOT = { lidoPorUsuarios: { some: { tenantId, usuarioId: userId, visto: true } } };
  } else if (filtros.status === 'Visto') {
    where.lidoPorUsuarios = { some: { tenantId, usuarioId: userId, visto: true } };
  }

  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.prioridade) where.prioridade = filtros.prioridade;

  if (filtros.search) {
    where.OR = [
      { titulo: { contains: filtros.search, mode: 'insensitive' } },
      { subtitulo: { contains: filtros.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

const ALERTA_LIDO_SELECT = {
  lidoPorUsuarios: {
    select: { visto: true, dataVisto: true },
  },
};

export async function listarAlertasPaginado({ tenantId, userId, baseline, page, pageSize, filtros = {} }) {
  const skip = (page - 1) * pageSize;
  const where = buildAlertaWhere({ tenantId, userId, baseline, filtros });

  const [data, total] = await prisma.$transaction([
    prisma.alerta.findMany({
      where,
      include: {
        lidoPorUsuarios: {
          where: { tenantId, usuarioId: userId },
          select: { visto: true, dataVisto: true },
        },
      },
      orderBy: { data: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.alerta.count({ where }),
  ]);

  return { data, total };
}

export async function contarMetricasAlertas({ tenantId, userId, baseline }) {
  // `total`, `criticos` e `recomendacoes` permanecem globais do tenant para
  // preservar a leitura agregada do dashboard. `naoVistos` aplica baseline para
  // refletir o que o usuario tem de fato pendente de leitura.
  const baselineFiltro = baseline ? { data: { gte: baseline } } : {};

  const [total, naoVistos, criticos, recomendacoes] = await Promise.all([
    prisma.alerta.count({ where: { tenantId } }),
    prisma.alerta.count({
      where: {
        tenantId,
        ...baselineFiltro,
        NOT: { lidoPorUsuarios: { some: { tenantId, usuarioId: userId, visto: true } } },
      },
    }),
    prisma.alerta.count({ where: { tenantId, prioridade: 'Alta' } }),
    prisma.alerta.count({ where: { tenantId, tipo: 'Recomendação' } }),
  ]);

  const vistos = Math.max(0, total - naoVistos);
  return { total, naoVistos, vistos, criticos, recomendacoes };
}

// kept for backward-compat (dashboard usa)
export async function contarAlertasNaoVistosDoUsuario({ tenantId, userId, baseline }) {
  const baselineFiltro = baseline ? { data: { gte: baseline } } : {};

  return prisma.alerta.count({
    where: {
      tenantId,
      ...baselineFiltro,
      NOT: { lidoPorUsuarios: { some: { tenantId, usuarioId: userId, visto: true } } },
    },
  });
}

export function buscarAlertaPorId({ tenantId, alertaId }) {
  return prisma.alerta.findFirst({ where: { id: alertaId, tenantId } });
}

export function buscarUsuarioDoTenant({ tenantId, userId }) {
  return prisma.usuario.findFirst({
    where: { id: userId, tenantId },
    select: { id: true },
  });
}

export function buscarLeituraAlerta({ tenantId, alertaId, userId }) {
  return prisma.alertaLidoPorUsuario.findFirst({
    where: { tenantId, alertaId, usuarioId: userId },
  });
}

export function atualizarLeituraAlerta({ alertaId, userId, visto }) {
  return prisma.alertaLidoPorUsuario.update({
    where: { alertaId_usuarioId: { alertaId, usuarioId: userId } },
    data: { visto, dataVisto: visto ? new Date() : null },
  });
}

export function criarLeituraAlerta({ tenantId, alertaId, userId, visto }) {
  return prisma.alertaLidoPorUsuario.create({
    data: {
      tenant: { connect: { id: tenantId } },
      alerta: { connect: { tenantId_id: { tenantId, id: alertaId } } },
      usuario: { connect: { tenantId_id: { tenantId, id: userId } } },
      visto,
      dataVisto: visto ? new Date() : null,
    },
  });
}

export function buscarAlertaFormatado({ tenantId, alertaId, userId }) {
  return prisma.alerta.findFirst({
    where: { id: alertaId, tenantId },
    include: {
      lidoPorUsuarios: {
        where: { tenantId, usuarioId: userId },
        select: { visto: true, dataVisto: true },
      },
    },
  });
}
