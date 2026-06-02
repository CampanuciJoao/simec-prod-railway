import prisma from '../prismaService.js';
import { auditarLicoesPeriodicamente } from '../ai/licaoAuditoriaWorker.js';

// Servico de leitura/escrita do painel "Auditoria de licoes IA"
// (SuperAdmin do Tenant System apenas).

function toNumber(value) {
  if (value == null) return 0;
  const num = typeof value === 'object' && 'toNumber' in value ? value.toNumber() : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function resumoAuditoriaService() {
  const [byStatus, totalAtivas, ultimaAuditoria, padroesMaisComuns] = await Promise.all([
    prisma.iaCategoriaLicao.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.iaCategoriaLicao.count({ where: { ativa: true, status: 'APROVADA' } }),
    prisma.iaLicaoAuditoria.findFirst({
      where: { origem: 'job_semanal' },
      orderBy: { criadoEm: 'desc' },
      select: { criadoEm: true },
    }),
    // Top 5 padroes mais flagados nos ultimos 30 dias — feedback pra
    // evoluir o detector. Faz unnest do JSON array de padroes.
    prisma.$queryRaw`
      SELECT
        elem AS padrao,
        COUNT(*)::int AS quantidade
      FROM "ia_licao_auditoria",
           jsonb_array_elements_text(padroes) AS elem
      WHERE "criado_em" > NOW() - INTERVAL '30 days'
        AND resultado = 'suspeita'
      GROUP BY elem
      ORDER BY quantidade DESC
      LIMIT 5
    `,
  ]);

  const distribuicao = byStatus.reduce(
    (acc, r) => ({ ...acc, [r.status]: r._count.id }),
    { APROVADA: 0, QUARENTENA: 0, REJEITADA: 0 }
  );

  return {
    distribuicaoStatus: distribuicao,
    licoesAtivas: totalAtivas,
    ultimaAuditoriaJob: ultimaAuditoria?.criadoEm || null,
    padroesMaisComuns30d: padroesMaisComuns,
  };
}

export async function listarQuarentenaService({ pagina = 1, tamanhoPagina = 20 } = {}) {
  const skip = (pagina - 1) * tamanhoPagina;
  const [items, total] = await Promise.all([
    prisma.iaCategoriaLicao.findMany({
      where: { status: 'QUARENTENA' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: tamanhoPagina,
      include: {
        auditorias: {
          orderBy: { criadoEm: 'desc' },
          take: 1,
          select: { padroes: true, trecho: true, criadoEm: true, origem: true },
        },
      },
    }),
    prisma.iaCategoriaLicao.count({ where: { status: 'QUARENTENA' } }),
  ]);

  return {
    items: items.map((l) => ({
      id: l.id,
      textoDespersonalizado: l.textoDespersonalizado,
      categoriaCorreta: l.categoriaCorreta,
      serviceTypeCode: l.serviceTypeCode,
      criadaEm: l.createdAt,
      ultimaAuditoria: l.auditorias[0] || null,
    })),
    total,
    pagina,
    tamanhoPagina,
  };
}

export async function decidirSobreLicaoService({
  licaoId,
  decisao,
  revisorId,
}) {
  if (!['APROVADA', 'REJEITADA'].includes(decisao)) {
    throw new Error('decisao_invalida');
  }

  const licao = await prisma.iaCategoriaLicao.findUnique({ where: { id: licaoId } });
  if (!licao) throw new Error('licao_nao_encontrada');
  if (licao.status !== 'QUARENTENA') throw new Error('licao_nao_em_quarentena');

  const agora = new Date();
  await prisma.$transaction([
    prisma.iaCategoriaLicao.update({
      where: { id: licaoId },
      data: {
        status: decisao,
        ativa: decisao === 'APROVADA',
        ultimaAuditoriaEm: agora,
      },
    }),
    prisma.iaLicaoAuditoria.create({
      data: {
        licaoId,
        resultado: decisao === 'APROVADA' ? 'limpa' : 'suspeita',
        padroes: [],
        origem: 'revisao_manual',
        revisadoPor: revisorId,
        revisadoEm: agora,
        decisao,
      },
    }),
  ]);

  return { ok: true, decisao };
}

export async function rodarAuditoriaAgoraService({ limite = 500 } = {}) {
  return auditarLicoesPeriodicamente({ limite });
}
