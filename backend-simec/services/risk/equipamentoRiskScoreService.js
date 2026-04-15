const prisma = require('../lib/prisma');
const { calcularScoreRisco } = require('../alertas/recomendacao/recomendacaoAlertScoring');

function definirNivel(score) {
  if (score >= 35) return 'Critico';
  if (score >= 22) return 'Alto';
  if (score >= 12) return 'Moderado';
  return 'Baixo';
}

async function calcularEAtualizarScoreEquipamento(equipamentoId, tenantId) {
  const historico = await prisma.ocorrencia.findMany({
    where: {
      tenantId,
      equipamentoId,
    },
  });

  const equipamento = await prisma.equipamento.findUnique({
    where: { id: equipamentoId },
    select: {
      status: true,
      tipo: true,
      unidadeId: true,
    },
  });

  const score = calcularScoreRisco({
    historico,
    statusEquipamento: equipamento.status,
    tipoEquipamento: equipamento.tipo,
    unidadeId: equipamento.unidadeId,
  });

  const nivel = definirNivel(score);

  await prisma.equipamento.update({
    where: { id: equipamentoId },
    data: {
      riskScore: score,
      riskLevel: nivel,
      riskUpdatedAt: new Date(),
    },
  });

  return { score, nivel };
}

module.exports = {
  calcularEAtualizarScoreEquipamento,
};