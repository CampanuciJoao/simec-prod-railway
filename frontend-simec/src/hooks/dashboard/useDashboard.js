import { useCallback, useEffect, useState } from 'react';
import { getDashboardData } from '../../services/api';

const DASHBOARD_INITIAL_STATE = {
  totalEquipamentos: 0,
  emManutencao: 0,
  ativos: 0,
  inativos: 0,
  manutencoesPorTipo: [],
  statusEquipamentos: [],
  alertas: [],
};

export function useDashboard() {
  const [data, setData] = useState(DASHBOARD_INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getDashboardData();

      setData({
        totalEquipamentos: response?.totalEquipamentos ?? 0,
        emManutencao: response?.emManutencao ?? 0,
        ativos: response?.ativos ?? 0,
        inativos: response?.inativos ?? 0,
        manutencoesPorTipo: Array.isArray(response?.manutencoesPorTipo)
          ? response.manutencoesPorTipo
          : [],
        statusEquipamentos: Array.isArray(response?.statusEquipamentos)
          ? response.statusEquipamentos
          : [],
        alertas: Array.isArray(response?.alertas)
          ? response.alertas
          : [],
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
    loadDashboard();
  }, [loadDashboard]);

  return {
    data,
    loading,
    error,
    recarregar: loadDashboard,
  };
}