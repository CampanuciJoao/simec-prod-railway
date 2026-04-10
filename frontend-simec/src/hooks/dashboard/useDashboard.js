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
  statusEquipamentos: null,
  manutencoesPorTipo: null,
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
      const statusValues = response?.statusEquipamentos?.data || [];

      const ativos =
        statusValues[statusLabels.findIndex((label) => label === 'Operante')] || 0;

      const inativos =
        (statusValues[statusLabels.findIndex((label) => label === 'Inoperante')] || 0) +
        (statusValues[statusLabels.findIndex((label) => label === 'UsoLimitado')] || 0);

      setData({
        totalEquipamentos: Number(response?.equipamentosCount ?? 0),
        emManutencao: Number(response?.manutencoesCount ?? 0),
        contratosVencendo: Number(response?.contratosVencendoCount ?? 0),
        alertasAtivos: Number(response?.alertasAtivos ?? 0),
        ativos,
        inativos,
        alertas: Array.isArray(response?.alertasRecentes) ? response.alertasRecentes : [],
        statusEquipamentos: response?.statusEquipamentos || null,
        manutencoesPorTipo: response?.manutencoesPorTipoMes || null,
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