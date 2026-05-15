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
    // Card "Em manutenção" do Dashboard = estado real do parque, não OS
    // abertas. Conta equipamentos cujo status atual é EmManutencao (i.e.
    // manutenção iniciada, equipamento bloqueado).
    prisma.equipamento.count({
      where: { tenantId, status: 'EmManutencao' },
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
      orderBy: { createdAt: 'desc' },
      take: 500,
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
    prisma.osCorretiva.findMany({
      where: {
        tenantId,
        status: { notIn: ['Concluida', 'Cancelada'] },
      },
      orderBy: { dataHoraAbertura: 'desc' },
      take: 8,
      select: {
        id: true,
        descricaoProblema: true,
        tipo: true,
        status: true,
        dataHoraAbertura: true,
        equipamento: {
          select: { id: true, modelo: true, tag: true },
        },
      },
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        titulo: r.descricaoProblema,
        gravidade: r.status,
        tipo: r.tipo,
        data: r.dataHoraAbertura,
        equipamento: r.equipamento,
      }))
    ),
  ]);
}
