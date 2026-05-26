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
    // Alertas não vistos por este usuário, contados com breakdown por
    // prioridade. Devolve { total, alta, media, baixa }.
    prisma.alerta
      .groupBy({
        by: ['prioridade'],
        where: {
          tenantId,
          NOT: {
            lidoPorUsuarios: {
              some: { tenantId, usuarioId: userId, visto: true },
            },
          },
        },
        _count: { id: true },
      })
      .then((rows) => {
        const out = { total: 0, alta: 0, media: 0, baixa: 0 };
        for (const r of rows) {
          const qtd = r._count.id;
          out.total += qtd;
          if (r.prioridade === 'Alta') out.alta = qtd;
          else if (r.prioridade === 'Media') out.media = qtd;
          else if (r.prioridade === 'Baixa') out.baixa = qtd;
        }
        return out;
      }),
    prisma.equipamento.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    }),
    // Grafico "Historico de manutencoes" mostra manutencoes EXECUTADAS
    // (concluidas) por mes — nao as agendadas. Filtra por status Concluida
    // e usa dataConclusao tanto pro filtro temporal quanto pro agrupamento
    // no adapter. Manutencoes em andamento ou agendadas para o futuro
    // nao entram no historico.
    prisma.manutencao.findMany({
      where: {
        tenantId,
        status: 'Concluida',
        dataConclusao: { gte: seisMesesAtras },
      },
      select: {
        dataConclusao: true,
        tipo: true,
      },
      orderBy: { dataConclusao: 'desc' },
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
