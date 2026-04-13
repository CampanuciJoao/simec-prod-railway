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

  const total = totalInicioProx + totalIniciadas + totalFimProx + totalConfirmacao;

  console.log(
    `[ALERTAS_MANUTENCAO][${tenantId}] Concluído | proxInicio=${totalInicioProx} | iniciadas=${totalIniciadas} | proxFim=${totalFimProx} | aguardandoConfirmacao=${totalConfirmacao}`
  );

  return total;
}

export async function gerarAlertasManutencao() {
  const agora = getAgora();

  console.log(
    `[ALERTAS_MANUTENCAO] Iniciando ciclo global às ${agora.toLocaleString('pt-BR')}`
  );

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  let totalGlobal = 0;

  for (const tenant of tenants) {
    const totalTenant = await processarTenant(tenant.id, agora);
    totalGlobal += totalTenant;
  }

  console.log(`[ALERTAS_MANUTENCAO] TOTAL GLOBAL: ${totalGlobal}`);

  return totalGlobal;
}