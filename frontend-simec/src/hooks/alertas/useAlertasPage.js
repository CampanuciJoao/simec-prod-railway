import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  getAlertas,
  updateStatusAlerta,
  dismissAlerta as dismissAlertaApi,
} from '@/services/api';

import { useToast } from '@/contexts/ToastContext';

import {
  normalizarArrayAlertas,
  calcularMetricasAlertas,
  buildSelectFiltersConfig,
  filtrarAlertas,
  buildActiveFiltersAlertas,
} from '@/utils/alertas/alertasPageUtils';

const FILTROS_INICIAIS = {
  status: '',
  tipo: '',
  prioridade: '',
};

export function useAlertasPage() {
  const { addToast } = useToast();

  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const fetchAlertas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAlertas();
      setAlertas(normalizarArrayAlertas(data));
    } catch (err) {
      setError(err);
      setAlertas([]);
      addToast('Erro ao carregar alertas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  const clearFilter = useCallback((key) => {
    setFiltros((prev) => ({
      ...prev,
      [key]: '',
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFiltros(FILTROS_INICIAIS);
    setSearchTerm('');
  }, []);

  const selectFiltersConfig = useMemo(() => {
    return buildSelectFiltersConfig(filtros, setFiltros);
  }, [filtros]);

  const alertasFiltrados = useMemo(() => {
    return filtrarAlertas(alertas, searchTerm, filtros);
  }, [alertas, searchTerm, filtros]);

  const metricas = useMemo(() => {
    return calcularMetricasAlertas(alertas);
  }, [alertas]);

  const activeFilters = useMemo(() => {
    return buildActiveFiltersAlertas(filtros);
  }, [filtros]);

  const updateStatus = useCallback(
    async (id, status) => {
      try {
        await updateStatusAlerta(id, status);

        setAlertas((prev) =>
          prev.map((alerta) =>
            alerta.id === id ? { ...alerta, status } : alerta
          )
        );
      } catch {
        addToast('Erro ao atualizar status.', 'error');
      }
    },
    [addToast]
  );

  const dismissItem = useCallback(
    async (id) => {
      try {
        await dismissAlertaApi(id);

        setAlertas((prev) => prev.filter((alerta) => alerta.id !== id));

        addToast('Alerta dispensado.', 'success');
      } catch {
        addToast('Erro ao dispensar alerta.', 'error');
      }
    },
    [addToast]
  );

  return {
    alertas,
    alertasFiltrados,
    loading,
    error,

    searchTerm,
    setSearchTerm,

    filtros,
    setFiltros,
    selectFiltersConfig,
    activeFilters,

    clearFilter,
    clearAllFilters,

    metricas,

    updateStatus,
    dismissAlerta: dismissItem,

    refetch: fetchAlertas,
  };
}