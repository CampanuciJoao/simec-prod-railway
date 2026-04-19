import { buscarResumoDashboard } from './dashboardRepository.js';
import { adaptarDashboardResponse } from './dashboardAdapter.js';

export async function obterDashboardService({ tenantId, userId }) {
  const hoje = new Date();
  const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);

  const [
    totalEquipamentos,
    manutencoesPendentes,
    contratosVencendo,
    alertasNaoVistosCount,
    statusEquipamentosGroups,
    manutencoesDosUltimos6Meses,
    alertasRecentes,
  ] = await buscarResumoDashboard({
    tenantId,
    userId,
    hoje,
    seisMesesAtras,
  });

  return {
    ok: true,
    data: adaptarDashboardResponse({
      totalEquipamentos,
      manutencoesPendentes,
      contratosVencendo,
      alertasNaoVistosCount,
      statusEquipamentosGroups,
      manutencoesDosUltimos6Meses,
      alertasRecentes,
    }),
  };
}
