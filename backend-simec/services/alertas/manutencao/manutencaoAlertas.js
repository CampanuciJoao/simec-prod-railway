import prisma from '../../prismaService.js';
import { getAgora } from '../../timeService.js';

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

/**
 * 🌍 Orquestrador global
 */
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
  const tenantsAfetados = [];

  // 🔥 paralelismo por tenant
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