import { useCallback, useEffect, useState } from 'react';
import { getDashboardData } from '../../services/api';

const INITIAL_STATE = {
  totalEquipamentos: 0,
  emManutencao: 0,
  contratosVencendo: 0,
  alertasAtivos: 0,
  ativos: 0,
  inativos: 0,
  alertas: [],
  statusEquipamentos: [],
  manutencoesPorTipo: [],
};

function normalizarStatusEquipamentos(statusEquipamentos) {
  const labels = statusEquipamentos?.labels || [];
  const values = statusEquipamentos?.data || [];

  if (!Array.isArray(labels) || !Array.isArray(values)) return [];

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
    let total = 0;

    datasets.forEach((dataset) => {
      if (Array.isArray(dataset?.data)) {
        total += Number(dataset.data[index] ?? 0);
      }
    });

    return {
      name: String(label),
      value: total,
    };
  });
}

export function useDashboard() {
  const [data, setData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregarDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getDashboardData();

      const statusEquipamentosNormalizados = normalizarStatusEquipamentos(
        response?.statusEquipamentos
      );

      const manutencoesPorTipoNormalizadas = normalizarManutencoesPorTipo(
        response?.manutencoesPorTipoMes
      );

      const ativos =
        statusEquipamentosNormalizados.find((item) => item.name === 'Operante')
          ?.value || 0;

      const inativos =
        (statusEquipamentosNormalizados.find((item) => item.name === 'Inoperante')
          ?.value || 0) +
        (statusEquipamentosNormalizados.find((item) => item.name === 'UsoLimitado')
          ?.value || 0);

      setData({
        totalEquipamentos: Number(response?.equipamentosCount ?? 0),
        emManutencao: Number(response?.manutencoesCount ?? 0),
        contratosVencendo: Number(response?.contratosVencendoCount ?? 0),
        alertasAtivos: Number(response?.alertasAtivos ?? 0),
        ativos,
        inativos,
        alertas: Array.isArray(response?.alertasRecentes)
          ? response.alertasRecentes
          : [],
        statusEquipamentos: statusEquipamentosNormalizados,
        manutencoesPorTipo: manutencoesPorTipoNormalizadas,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar dados do dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  return {
    data,
    loading,
    error,
    recarregar: carregarDashboard,
  };
}