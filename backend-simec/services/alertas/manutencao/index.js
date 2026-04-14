// Ficheiro: services/alertas/manutencao/index.js
// Descrição: orquestrador global dos alertas de manutenção

import prisma from '../../prismaService.js';
import { getAgora } from '../../timeService.js';
import {
  gerarAlertasAproximacaoInicio,
  iniciarManutencoesAutomaticamente,
  gerarAlertasAproximacaoFim,
  moverParaAguardandoConfirmacao,
} from './manutencaoAlertRules.js';

async function processarTenant(tenantId, agora) {
  console.log(`[ALERTAS_MANUTENCAO] Processando tenant ${tenantId}`);

  const totalInicioProx = await gerarAlertasAproximacaoInicio(tenantId, agora);
  const totalIniciadas = await iniciarManutencoesAutomaticamente(tenantId, agora);
  const totalFimProx = await gerarAlertasAproximacaoFim(tenantId, agora);
  const totalConfirmacao = await moverParaAguardandoConfirmacao(tenantId, agora);

  const total =
    totalInicioProx +
    totalIniciadas +
    totalFimProx +
    totalConfirmacao;

  console.log(
    `[ALERTAS_MANUTENCAO][${tenantId}] Concluído | proxInicio=${totalInicioProx} | iniciadas=${totalIniciadas} | proxFim=${totalFimProx} | aguardandoConfirmacao=${totalConfirmacao} | total=${total}`
  );

  return total;
}

export async function gerarAlertasManutencao() {
  const agora = getAgora();

  console.log(
    `[ALERTAS_MANUTENCAO] Iniciando ciclo global em UTC: ${agora.toISOString()}`
  );

  const tenants = await prisma.tenant.findMany({
    where: {
      ativo: true,
    },
    select: {
      id: true,
    },
  });

  let totalGlobal = 0;

  for (const tenant of tenants) {
    const totalTenant = await processarTenant(tenant.id, agora);
    totalGlobal += totalTenant;
  }

  console.log(`[ALERTAS_MANUTENCAO] TOTAL GLOBAL: ${totalGlobal}`);

  return totalGlobal;
}