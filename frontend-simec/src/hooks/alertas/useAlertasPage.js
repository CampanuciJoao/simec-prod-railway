import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  getAlertas,
  updateStatusAlerta,
  dismissAlerta,
} from '@/services/api';

import { useToast } from '@/contexts/ToastContext';

function normalizarArray(data) {
  return Array.isArray(data) ? data : [];
}

function calcularMetricas(alertas) {
  return {
    total: alertas.length,
    naoVistos: alertas.filter((a) => a.status === 'NaoVisto').length,
    vistos: alertas.filter((a) => a.status === 'Visto').length,
    criticos: alertas.filter((a) => a.prioridade === 'Alta').length,
  };
}

export function useAlertasPage() {
  const { addToast } = useToast();

  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    status: '',
    tipo: '',
    prioridade: '',
  });

  /**
   * =========================
   * FETCH
   * =========================
   */
  const fetchAlertas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAlertas();
      setAlertas(normalizarArray(data));
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

  /**
   * =========================
   * FILTROS
   * =========================
   */
  const clearFilter = useCallback((key) => {
    setFiltros((prev) => ({
      ...prev,
      [key]: '',
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFiltros({
      status: '',
      tipo: '',
      prioridade: '',
    });
    setSearchTerm('');
  }, []);

  const selectFiltersConfig = useMemo(
    () => [
      {
        id: 'status',
        label: 'Status',
        value: filtros.status,
        options: [
          { label: 'Não visto', value: 'NaoVisto' },
          { label: 'Visto', value: 'Visto' },
        ],
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, status: value })),
      },
      {
        id: 'tipo',
        label: 'Tipo',
        value: filtros.tipo,
        options: [
          { label: 'Alerta', value: 'Alerta' },
          { label: 'Recomendação', value: 'Recomendação' },
        ],
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, tipo: value })),
      },
      {
        id: 'prioridade',
        label: 'Prioridade',
        value: filtros.prioridade,
        options: [
          { label: 'Alta', value: 'Alta' },
          { label: 'Média', value: 'Media' },
          { label: 'Baixa', value: 'Baixa' },
        ],
        onChange: (value) =>
          setFiltros((prev) => ({ ...prev, prioridade: value })),
      },
    ],
    [filtros]
  );

  /**
   * =========================
   * FILTRAGEM
   * =========================
   */
  const alertasFiltrados = useMemo(() => {
    let items = [...alertas];

    if (searchTerm) {
      const termo = searchTerm.toLowerCase();

      items = items.filter(
        (a) =>
          a.titulo?.toLowerCase().includes(termo) ||
          a.subtitulo?.toLowerCase().includes(termo)
      );
    }

    if (filtros.status) {
      items = items.filter((a) => a.status === filtros.status);
    }

    if (filtros.tipo) {
      items = items.filter((a) => a.tipo === filtros.tipo);
    }

    if (filtros.prioridade) {
      items = items.filter((a) => a.prioridade === filtros.prioridade);
    }

    return items;
  }, [alertas, searchTerm, filtros]);

  /**
   * =========================
   * MÉTRICAS
   * =========================
   */
  const metricas = useMemo(() => {
    return calcularMetricas(alertas);
  }, [alertas]);

  const activeFilters = useMemo(() => {
    const result = [];

    if (filtros.status)
      result.push({
        key: 'status',
        label: `Status: ${filtros.status}`,
      });

    if (filtros.tipo)
      result.push({
        key: 'tipo',
        label: `Tipo: ${filtros.tipo}`,
      });

    if (filtros.prioridade)
      result.push({
        key: 'prioridade',
        label: `Prioridade: ${filtros.prioridade}`,
      });

    return result;
  }, [filtros]);

  /**
   * =========================
   * AÇÕES
   * =========================
   */
  const updateStatus = useCallback(
    async (id, status) => {
      try {
        await updateStatusAlerta(id, status);

        setAlertas((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status } : a
          )
        );
      } catch {
        addToast('Erro ao atualizar status.', 'error');
      }
    },
    [addToast]
  );

  const dismissAlerta = useCallback(
    async (id) => {
      try {
        await dismissAlerta(id);

        setAlertas((prev) =>
          prev.filter((a) => a.id !== id)
        );

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
    dismissAlerta,

    refetch: fetchAlertas,
  };
}