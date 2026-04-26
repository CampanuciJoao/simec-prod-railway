// Ficheiro: services/alertas/manutencao/index.js
// Descrição: orquestrador global dos alertas de manutenção

import prisma from '../../prismaService.js';
import { getAgora } from '../../time/index.js';

import {
  gerarAlertasAproximacaoInicio,
  iniciarManutencoesAutomaticamente,
  gerarAlertasAproximacaoFim,
  moverParaAguardandoConfirmacao,
} from './manutencaoAlertRules.js';

/**
 * 🔧 Processa um tenant
 */
async function processarTenant(tenantId, agora) {
  console.log(`[ALERTAS_MANUTENCAO] Processando tenant ${tenantId}`);

  const [
    totalInicioProx,
    totalIniciadas,
    totalFimProx,
    totalConfirmacao,
  ] = await Promise.all([
    gerarAlertasAproximacaoInicio(tenantId, agora),
    iniciarManutencoesAutomaticamente(tenantId, agora),
    gerarAlertasAproximacaoFim(tenantId, agora),
    moverParaAguardandoConfirmacao(tenantId, agora),
  ]);

  const total =
    totalInicioProx +
    totalIniciadas +
    totalFimProx +
    totalConfirmacao;

  console.log(
    `[ALERTAS_MANUTENCAO][${tenantId}] Concluído | proxInicio=${totalInicioProx} | iniciadas=${totalIniciadas} | proxFim=${totalFimProx} | aguardandoConfirmacao=${totalConfirmacao} | total=${total}`
  );

  return {
    total,
    afetou: total > 0,
  };
}

export async function processarAlertasManutencaoDoTenant(
  tenantId,
  agora = getAgora()
) {
  const resultado = await processarTenant(tenantId, agora);

  return {
    total: resultado.total,
    tenantsAfetados: resultado.afetou ? [tenantId] : [],
  };
}

/**
 * 🌍 Orquestrador global
 */
export async function gerarAlertasManutencao() {
  const agora = getAgora();

  console.log(
    `[ALERTAS_MANUTENCAO] Iniciando ciclo global em UTC: ${agora.toISOString()}`
  );

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  let totalGlobal = 0;
  const tenantsAfetados = [];

  // 🔥 processamento paralelo
  const results = await Promise.all(
    tenants.map((tenant) =>
      processarTenant(tenant.id, agora).then((res) => ({
        tenantId: tenant.id,
        ...res,
      }))
    )
  );

  for (const result of results) {
    totalGlobal += result.total;

    if (result.afetou) {
      tenantsAfetados.push(result.tenantId);
    }
  }

  console.log(
    `[ALERTAS_MANUTENCAO] TOTAL GLOBAL: ${totalGlobal} | tenantsAfetados=${tenantsAfetados.length}`
  );

  return {
    total: totalGlobal,
    tenantsAfetados,
  };
}

export default gerarAlertasManutencao;
