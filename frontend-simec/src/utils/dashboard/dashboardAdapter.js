const INITIAL_DASHBOARD_STATE = {
  totalEquipamentos: 0,
  emManutencao: 0,
  contratosVencendo: 0,
  alertasAtivos: 0,
  ativos: 0,
  inativos: 0,
  alertas: [],
  ocorrenciasPendentes: [],
  statusEquipamentos: [],
  manutencoesPorTipo: [],
};

function normalizarStatusEquipamentos(statusEquipamentos) {
  const labels = statusEquipamentos?.labels || [];
  const values = statusEquipamentos?.data || [];

  if (!Array.isArray(labels) || !Array.isArray(values)) {
    return [];
  }

  return labels.map((label, index) => ({
    name: String(label),
    value: Number(values[index] ?? 0),
  }));
}

function normalizarManutencoesPorTipo(manutencoesPorTipoMes) {
  const labels = manutencoesPorTipoMes?.labels || [];
  const datasets = manutencoesPorTipoMes?.datasets || [];

  if (!Array.isArray(labels) || !Array.isArray(datasets) || datasets.length === 0) {
    return [];
  }

  return labels.map((label, index) => {
    const value = datasets.reduce((total, dataset) => {
      if (!Array.isArray(dataset?.data)) {
        return total;
      }

      return total + Number(dataset.data[index] ?? 0);
    }, 0);

    return {
      name: String(label),
      value,
    };
  });
}

export function adaptDashboardResponse(response) {
  const statusEquipamentos = normalizarStatusEquipamentos(
    response?.statusEquipamentos
  );

  const manutencoesPorTipo = normalizarManutencoesPorTipo(
    response?.manutencoesPorTipoMes
  );

  const ativos =
    statusEquipamentos.find((item) => item.name === 'Operante')?.value || 0;

  const inativos =
    (statusEquipamentos.find((item) => item.name === 'Inoperante')?.value || 0) +
    (statusEquipamentos.find((item) => item.name === 'UsoLimitado')?.value || 0);

  return {
    totalEquipamentos: Number(response?.equipamentosCount ?? 0),
    emManutencao: Number(response?.manutencoesCount ?? 0),
    contratosVencendo: Number(response?.contratosVencendoCount ?? 0),
    alertasAtivos: Number(response?.alertasAtivos ?? 0),
    ativos,
    inativos,
    alertas: Array.isArray(response?.alertasRecentes)
      ? response.alertasRecentes
      : [],
    ocorrenciasPendentes: Array.isArray(response?.ocorrenciasPendentes)
      ? response.ocorrenciasPendentes
      : [],
    statusEquipamentos,
    manutencoesPorTipo,
  };
}

export { INITIAL_DASHBOARD_STATE };