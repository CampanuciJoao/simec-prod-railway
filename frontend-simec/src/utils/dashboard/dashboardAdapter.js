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

// enum -> rotulo formal em PT-BR. `key` (enum bruto) preserva semantica
// para cor e filtro de navegacao; `name` e o texto exibido na legenda.
const STATUS_EQUIPAMENTO_LABELS = {
  Operante: 'Operante',
  Inoperante: 'Inoperante',
  UsoLimitado: 'Uso limitado',
  EmManutencao: 'Em manutenção',
  Desativado: 'Desativado',
};

function normalizarStatusEquipamentos(statusEquipamentos) {
  const labels = statusEquipamentos?.labels || [];
  const values = statusEquipamentos?.data || [];

  if (!Array.isArray(labels) || !Array.isArray(values)) {
    return [];
  }

  return labels.map((label, index) => {
    const key = String(label);
    return {
      key,
      name: STATUS_EQUIPAMENTO_LABELS[key] || key,
      value: Number(values[index] ?? 0),
    };
  });
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
    statusEquipamentos.find((item) => item.key === 'Operante')?.value || 0;

  const inativos =
    (statusEquipamentos.find((item) => item.key === 'Inoperante')?.value || 0) +
    (statusEquipamentos.find((item) => item.key === 'UsoLimitado')?.value || 0);

  return {
    totalEquipamentos: Number(response?.equipamentosCount ?? 0),
    emManutencao: Number(response?.manutencoesCount ?? 0),
    contratosVencendo: Number(response?.contratosVencendoCount ?? 0),
    alertasAtivos: Number(response?.alertasAtivos ?? 0),
    alertasCriticos: Number(response?.alertasCriticosCount ?? 0),
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