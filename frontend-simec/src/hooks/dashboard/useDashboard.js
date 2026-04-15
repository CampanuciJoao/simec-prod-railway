import { useCallback, useEffect, useState } from 'react';
import { getDashboardData } from '../../services/api';
import {
  adaptDashboardResponse,
  INITIAL_DASHBOARD_STATE,
} from '../../utils/dashboard/dashboardAdapter';

export function useDashboard() {
  const [data, setData] = useState(INITIAL_DASHBOARD_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregarDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getDashboardData();
      const dashboardAdaptado = adaptDashboardResponse(response);

      setData(dashboardAdaptado);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar dados do dashboard.'
      );

      setData(INITIAL_DASHBOARD_STATE);
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