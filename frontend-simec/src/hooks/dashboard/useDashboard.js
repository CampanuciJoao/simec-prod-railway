import { useCallback, useEffect, useState } from 'react';
import { getDashboardData } from '../../services/api';

const INITIAL_STATE = {
  totalEquipamentos: 0,
  emManutencao: 0,
  ativos: 0,
  inativos: 0,
  manutencoesPorTipo: [],
  statusEquipamentos: [],
  alertas: [],
};

const normalizarLista = (valor) => (Array.isArray(valor) ? valor : []);

const normalizarPontos = (lista) => {
  if (!Array.isArray(lista)) return [];

  return lista
    .map((item) => {
      if (item?.name && typeof item?.value !== 'undefined') {
        return { name: item.name, value: Number(item.value) || 0 };
      }

      if (item?.label && typeof item?.value !== 'undefined') {
        return { name: item.label, value: Number(item.value) || 0 };
      }

      if (item?.tipo && typeof item?.total !== 'undefined') {
        return { name: item.tipo, value: Number(item.total) || 0 };
      }

      if (item?.status && typeof item?.total !== 'undefined') {
        return { name: item.status, value: Number(item.total) || 0 };
      }

      return null;
    })
    .filter(Boolean);
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

      setData({
        totalEquipamentos: Number(response?.totalEquipamentos ?? 0),
        emManutencao: Number(response?.emManutencao ?? 0),
        ativos: Number(response?.ativos ?? 0),
        inativos: Number(response?.inativos ?? 0),
        manutencoesPorTipo: normalizarPontos(
          normalizarLista(response?.manutencoesPorTipo)
        ),
        statusEquipamentos: normalizarPontos(
          normalizarLista(response?.statusEquipamentos)
        ),
        alertas: normalizarLista(response?.alertas),
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