import prisma from '../prismaService.js';
import {
  calcularScoreRisco,
  definirNivelRisco,
} from '../alertas/recomendacao/recomendacaoAlertScoring.js';

export async function buscarEquipamentoComHistoricoParaScore(
  tenantId,
  equipamentoId
) {
  return prisma.equipamento.findFirst({
    where: {
      tenantId,
      id: equipamentoId,
    },
    include: {
      unidade: true,
      ocorrencias: {
        where: {
          tenantId,
        },
        orderBy: {
          data: 'desc',
        },
      },
      manutencoes: {
        where: {
          tenantId,
        },
        orderBy: {
          dataHoraAgendamentoInicio: 'desc',
        },
      },
    },
  });
}

export async function calcularScoreEquipamento({
  tenantId,
  equipamentoId,
}) {
  const equipamento = await buscarEquipamentoComHistoricoParaScore(
    tenantId,
    equipamentoId
  );

  if (!equipamento) {
    throw new Error('EQUIPAMENTO_NAO_ENCONTRADO');
  }

  const unidadeNome = equipamento.unidade?.nomeSistema || 'N/A';

  const metricas = calcularScoreRisco({
    equipamento,
    unidadeNome,
    ocorrencias: equipamento.ocorrencias || [],
    manutencoes: equipamento.manutencoes || [],
  });

  const nivel = definirNivelRisco(metricas.scoreFinal);

  return {
    equipamento,
    metricas,
    score: metricas.scoreFinal,
    nivel,
    resumo: {
      scoreBase: metricas.scoreBase,
      scoreFinal: metricas.scoreFinal,
      ocorrencias: metricas.ocorrencias,
      corretivas: metricas.corretivas,
      preventivas: metricas.preventivas,
      calibracoes: metricas.calibracoes,
      inspecoes: metricas.inspecoes,
      gruposReincidencia: metricas.gruposReincidencia,
      maiorReincidencia: metricas.maiorReincidencia,
      pesoTipo: metricas.pesoTipo,
      pesoUnidade: metricas.pesoUnidade,
    },
  };
}

export async function calcularEAtualizarScoreEquipamento({
  tenantId,
  equipamentoId,
}) {
  const resultado = await calcularScoreEquipamento({
    tenantId,
    equipamentoId,
  });

  const riskUpdatedAt = new Date();

  await prisma.equipamento.update({
    where: {
      tenantId_id: {
        tenantId,
        id: equipamentoId,
      },
    },
    data: {
      riskScore: resultado.score,
      riskLevel: resultado.nivel,
      riskUpdatedAt,
    },
  });

  return {
    ...resultado,
    riskUpdatedAt,
  };
}

export async function recalcularScoresDoTenant(tenantId) {
  const equipamentos = await prisma.equipamento.findMany({
    where: { tenantId },
    select: { id: true },
  });

  if (equipamentos.length === 0) {
    return {
      total: 0,
      atualizados: 0,
      erros: [],
    };
  }

  const resultados = await Promise.allSettled(
    equipamentos.map((equipamento) =>
      calcularEAtualizarScoreEquipamento({
        tenantId,
        equipamentoId: equipamento.id,
      })
    )
  );

  const erros = [];
  let atualizados = 0;

  resultados.forEach((resultado, index) => {
    if (resultado.status === 'fulfilled') {
      atualizados += 1;
      return;
    }

    erros.push({
      equipamentoId: equipamentos[index].id,
      erro: resultado.reason?.message || 'ERRO_AO_RECALCULAR_SCORE',
    });
  });

  return {
    total: equipamentos.length,
    atualizados,
    erros,
  };
}