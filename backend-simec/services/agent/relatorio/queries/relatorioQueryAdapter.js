import prisma from '../../prismaService.js';
import { buscarManutencoesRealizadas } from '../../reportQueryService.js';

export async function buscarUltimaManutencao({
  tenantId,
  tipoManutencao,
  unidadeId,
  equipamentoId,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  const where = {
    tenantId,
    tipo: tipoManutencao,
  };

  if (equipamentoId) {
    where.equipamentoId = equipamentoId;
  } else if (unidadeId) {
    where.equipamento = {
      tenantId,
      unidadeId,
    };
  }

  return prisma.manutencao.findFirst({
    where,
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoInicio: 'desc',
    },
  });
}

export async function buscarListaManutencoesRelatorio({
  tenantId,
  dataInicio,
  dataFim,
  unidadeId,
  equipamentoId,
  tipoManutencao,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  return buscarManutencoesRealizadas({
    tenantId,
    dataInicio,
    dataFim,
    unidadeId,
    equipamentoId,
    tipoManutencao,
  });
}