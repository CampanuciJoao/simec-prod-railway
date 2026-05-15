import { buscarResumoDashboard } from './dashboardRepository.js';
import { adaptarDashboardResponse } from './dashboardAdapter.js';

export async function obterDashboardService({ tenantId, userId }) {
  const hoje = new Date();
  const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);

  // Nota: equipamentosEmManutencao = contagem por estado do equipamento
  // (status='EmManutencao'), não por número de OS abertas — o nome do binding
  // permanece como "manutencoesPendentes" por compatibilidade com o adapter,
  // mas a query no repository conta equipamentos.
  const [
    totalEquipamentos,
    manutencoesPendentes,
    contratosVencendo,
    alertasNaoVistosCount,
    statusEquipamentosGroups,
    manutencoesDosUltimos6Meses,
    alertasRecentes,
    ocorrenciasPendentes,
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
      ocorrenciasPendentes,
    }),
  };
}
