import prisma from '../prismaService.js';

export function buscarResumoDashboard({
  tenantId,
  userId,
  hoje,
  seisMesesAtras,
}) {
  return Promise.all([
    prisma.equipamento.count({
      where: { tenantId },
    }),
    prisma.manutencao.count({
      where: {
        tenantId,
        status: { in: ['Agendada', 'EmAndamento', 'AguardandoConfirmacao'] },
      },
    }),
    prisma.contrato.count({
      where: {
        tenantId,
        status: 'Ativo',
        dataFim: {
          gte: hoje,
          lte: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.alerta.count({
      where: {
        tenantId,
        NOT: {
          lidoPorUsuarios: {
            some: {
              tenantId,
              usuarioId: userId,
              visto: true,
            },
          },
        },
      },
    }),
    prisma.equipamento.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
    prisma.manutencao.findMany({
      where: {
        tenantId,
        createdAt: { gte: seisMesesAtras },
      },
      select: {
        createdAt: true,
        tipo: true,
      },
    }),
    prisma.alerta.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        titulo: true,
        prioridade: true,
        link: true,
      },
    }),
    prisma.ocorrencia.findMany({
      where: { tenantId, resolvido: false },
      orderBy: { data: 'desc' },
      take: 8,
      select: {
        id: true,
        titulo: true,
        gravidade: true,
        tipo: true,
        data: true,
        equipamento: {
          select: { id: true, modelo: true, tag: true },
        },
      },
    }),
  ]);
}
