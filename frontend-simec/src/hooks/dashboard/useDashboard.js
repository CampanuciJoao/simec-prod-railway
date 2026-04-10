import { useCallback, useEffect, useState } from 'react';
import { getDashboardData } from '../../services/api';

const INITIAL_STATE = {
  totalEquipamentos: 0,
  emManutencao: 0,
  contratosVencendo: 0,
  alertasAtivos: 0,
  manutencoesPorTipo: null,
  statusEquipamentos: null,
  alertas: [],
};

export function useDashboard() {
  const [data, setData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregarDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getDashboardData();

      const statusLabels = response?.statusEquipamentos?.labels || [];
      const statusData = response?.statusEquipamentos?.data || [];

      const ativos =
        statusData[statusLabels.findIndex((label) => label === 'Operante')] || 0;

      const inativos =
        (statusData[statusLabels.findIndex((label) => label === 'Inoperante')] || 0) +
        (statusData[statusLabels.findIndex((label) => label === 'UsoLimitado')] || 0);

      setData({
        totalEquipamentos: Number(response?.equipamentosCount ?? 0),
        emManutencao: Number(response?.manutencoesCount ?? 0),
        contratosVencendo: Number(response?.contratosVencendoCount ?? 0),
        alertasAtivos: Number(response?.alertasAtivos ?? 0),
        ativos,
        inativos,
        manutencoesPorTipo: response?.manutencoesPorTipoMes || null,
        statusEquipamentos: response?.statusEquipamentos || null,
        alertas: Array.isArray(response?.alertasRecentes) ? response.alertasRecentes : [],
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