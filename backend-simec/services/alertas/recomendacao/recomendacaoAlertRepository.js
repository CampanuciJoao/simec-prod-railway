import prisma from '../../prismaService.js';

export async function buscarEquipamentosComHistorico(tenantId, dataCorte) {
  return prisma.equipamento.findMany({
    where: {
      tenantId,
    },
    include: {
      unidade: true,
      ocorrencias: {
        where: {
          tenantId,
          data: {
            gte: dataCorte,
          },
        },
        orderBy: {
          data: 'desc',
        },
      },
      manutencoes: {
        where: {
          tenantId,
          OR: [
            {
              dataHoraAgendamentoInicio: {
                gte: dataCorte,
              },
            },
            {
              dataConclusao: {
                gte: dataCorte,
              },
            },
          ],
        },
        orderBy: {
          dataHoraAgendamentoInicio: 'desc',
        },
      },
    },
  });
}

export async function existeAlerta(tenantId, id) {
  const alerta = await prisma.alerta.findFirst({
    where: {
      tenantId,
      id,
    },
    select: {
      id: true,
    },
  });

  return !!alerta;
}

export async function criarAlertaRecomendacao(tenantId, payload) {
  return prisma.alerta.create({
    data: {
      tenantId,
      ...payload,
    },
  });
}