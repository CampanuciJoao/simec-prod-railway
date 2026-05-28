import prisma from '../prismaService.js';

// Servico de leitura para o painel SuperAdmin. So eh exposto via
// /api/superadmin/llm-call-log/* — protegido por requireSystemTenant.
// Custo USD eh decimal no banco; convertemos para Number na borda pra
// o frontend nao precisar lidar com BigDecimal.
//
// Janela padrao: ultimos 30 dias. Pode ser customizada via query params.

function janelaDe(de, ate) {
  const ateDate = ate ? new Date(ate) : new Date();
  const deDate = de ? new Date(de) : new Date(ateDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { gte: deDate, lte: ateDate };
}

function toNumber(value) {
  if (value == null) return 0;
  const num = typeof value === 'object' && 'toNumber' in value ? value.toNumber() : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function resumoGeralService({ de, ate } = {}) {
  const janela = janelaDe(de, ate);

  const [agregado, porStatus, porProvider] = await Promise.all([
    prisma.llmCallLog.aggregate({
      where: { createdAt: janela },
      _count: { id: true },
      _sum: { tokensIn: true, tokensOut: true, costUsd: true, durationMs: true },
      _avg: { durationMs: true },
    }),
    prisma.llmCallLog.groupBy({
      by: ['status'],
      where: { createdAt: janela },
      _count: { id: true },
    }),
    prisma.llmCallLog.groupBy({
      by: ['provider'],
      where: { createdAt: janela },
      _count: { id: true },
      _sum: { costUsd: true },
    }),
  ]);

  const totalChamadas = agregado._count.id;
  const distribuicaoStatus = porStatus.reduce(
    (acc, row) => ({ ...acc, [row.status]: row._count.id }),
    { ok: 0, fallback: 0, error: 0 }
  );

  return {
    janela: {
      de: janela.gte.toISOString(),
      ate: janela.lte.toISOString(),
    },
    totalChamadas,
    tokensIn: agregado._sum.tokensIn || 0,
    tokensOut: agregado._sum.tokensOut || 0,
    custoTotalUsd: toNumber(agregado._sum.costUsd),
    duracaoMediaMs: Math.round(agregado._avg.durationMs || 0),
    distribuicaoStatus,
    taxaFallback:
      totalChamadas > 0 ? distribuicaoStatus.fallback / totalChamadas : 0,
    taxaErro: totalChamadas > 0 ? distribuicaoStatus.error / totalChamadas : 0,
    porProvider: porProvider.map((row) => ({
      provider: row.provider,
      chamadas: row._count.id,
      custoUsd: toNumber(row._sum.costUsd),
    })),
  };
}

export async function porTenantService({ de, ate } = {}) {
  const janela = janelaDe(de, ate);

  const rows = await prisma.llmCallLog.groupBy({
    by: ['tenantId'],
    where: { createdAt: janela },
    _count: { id: true },
    _sum: { tokensIn: true, tokensOut: true, costUsd: true },
  });

  // Enriquece com nome do tenant (1 query batch pelos IDs distintos)
  const tenantIds = rows.map((r) => r.tenantId).filter(Boolean);
  const tenants = tenantIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, nome: true, slug: true },
      })
    : [];
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  return rows
    .map((row) => ({
      tenantId: row.tenantId,
      tenantNome: row.tenantId
        ? tenantMap.get(row.tenantId)?.nome || '(tenant removido)'
        : '(sem tenant / global)',
      tenantSlug: row.tenantId ? tenantMap.get(row.tenantId)?.slug || null : null,
      chamadas: row._count.id,
      tokensIn: row._sum.tokensIn || 0,
      tokensOut: row._sum.tokensOut || 0,
      custoUsd: toNumber(row._sum.costUsd),
    }))
    .sort((a, b) => b.custoUsd - a.custoUsd);
}

export async function porFeatureService({ de, ate } = {}) {
  const janela = janelaDe(de, ate);

  const rows = await prisma.llmCallLog.groupBy({
    by: ['feature'],
    where: { createdAt: janela },
    _count: { id: true },
    _sum: { tokensIn: true, tokensOut: true, costUsd: true },
    _avg: { durationMs: true },
  });

  return rows
    .map((row) => ({
      feature: row.feature,
      chamadas: row._count.id,
      tokensIn: row._sum.tokensIn || 0,
      tokensOut: row._sum.tokensOut || 0,
      custoUsd: toNumber(row._sum.costUsd),
      duracaoMediaMs: Math.round(row._avg.durationMs || 0),
    }))
    .sort((a, b) => b.custoUsd - a.custoUsd);
}

export async function serieDiariaService({ de, ate } = {}) {
  const janela = janelaDe(de, ate);

  // Agrega por dia via $queryRaw (Prisma groupBy nao suporta DATE_TRUNC).
  // Resultado: array de { dia, chamadas, custoUsd }.
  const rows = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "created_at") AS dia,
      COUNT(*)::int AS chamadas,
      COALESCE(SUM("cost_usd"), 0)::float AS "custoUsd",
      COALESCE(SUM("tokens_in"), 0)::int AS "tokensIn",
      COALESCE(SUM("tokens_out"), 0)::int AS "tokensOut"
    FROM "llm_call_log"
    WHERE "created_at" BETWEEN ${janela.gte} AND ${janela.lte}
    GROUP BY dia
    ORDER BY dia ASC
  `;

  return rows.map((r) => ({
    dia: r.dia,
    chamadas: r.chamadas,
    custoUsd: r.custoUsd,
    tokensIn: r.tokensIn,
    tokensOut: r.tokensOut,
  }));
}
