import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';

import { getAlertas, updateStatusAlerta, dismissAlerta as dismissAlertaApi } from '@/services/api';
import { useAlertas } from '@/contexts/AlertasContext';
import { useToast } from '@/contexts/ToastContext';
import { buildSelectFiltersConfig } from '@/utils/alertas/alertasPageUtils';

const PAGE_SIZE = 25;

function getFiltrosIniciais() {
  return { status: '', tipo: '', prioridade: '' };
}

export function useAlertasPage() {
  const { addToast } = useToast();
  const { refetchAlertas } = useAlertas();

  const [alertas, setAlertas]       = useState([]);
  const [metricas, setMetricas]     = useState({ total: 0, naoVistos: 0, vistos: 0, criticos: 0, recomendacoes: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros]       = useState(getFiltrosIniciais);

  const paramsRef = useRef({ searchTerm: '', filtros: getFiltrosIniciais(), page: 1 });

  const fetchPage = useCallback(async (page, search, filt) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAlertas({
        page,
        pageSize:   PAGE_SIZE,
        search:     search          || undefined,
        status:     filt.status     || undefined,
        tipo:       filt.tipo       || undefined,
        prioridade: filt.prioridade || undefined,
      });

      setAlertas(Array.isArray(res.data) ? res.data : []);
      setMetricas(res.metricas || { total: 0, naoVistos: 0, vistos: 0, criticos: 0, recomendacoes: 0 });
      setPagination({ page: res.page || 1, totalPages: res.totalPages || 1, total: res.total || 0 });
    } catch (err) {
      setError(err);
      setAlertas([]);
      addToast('Erro ao carregar alertas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const debouncedFetch = useMemo(
    () => debounce((search, filt) => fetchPage(1, search, filt), 300),
    [fetchPage]
  );

  useEffect(() => {
    paramsRef.current = { ...paramsRef.current, searchTerm, filtros, page: 1 };
    debouncedFetch(searchTerm, filtros);
    return () => debouncedFetch.cancel?.();
  }, [searchTerm, filtros, debouncedFetch]);

  const goToPage = useCallback((newPage) => {
    paramsRef.current.page = newPage;
    fetchPage(newPage, paramsRef.current.searchTerm, paramsRef.current.filtros);
  }, [fetchPage]);

  const refetch = useCallback(() => {
    fetchPage(paramsRef.current.page, paramsRef.current.searchTerm, paramsRef.current.filtros);
  }, [fetchPage]);

  const clearFilter = useCallback((key) => {
    if (key === 'searchTerm') { setSearchTerm(''); return; }
    setFiltros((prev) => ({ ...prev, [key]: '' }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setFiltros(getFiltrosIniciais());
  }, []);

  const onSearchChange = useCallback((e) => setSearchTerm(e.target.value), []);

  const selectFiltersConfig = useMemo(
    () => buildSelectFiltersConfig(filtros, setFiltros),
    [filtros]
  );

  const activeFilters = useMemo(() => {
    const result = [];
    if (searchTerm)         result.push({ key: 'searchTerm', label: 'Busca: ' + searchTerm });
    if (filtros.status)     result.push({ key: 'status',     label: 'Status: ' + filtros.status });
    if (filtros.tipo)       result.push({ key: 'tipo',       label: 'Tipo: ' + filtros.tipo });
    if (filtros.prioridade) result.push({ key: 'prioridade', label: 'Prioridade: ' + filtros.prioridade });
    return result;
  }, [searchTerm, filtros]);

  const updateStatus = useCallback(async (id, status) => {
    try {
      await updateStatusAlerta(id, status);
      setAlertas((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      await refetchAlertas?.();
    } catch {
      addToast('Erro ao atualizar status.', 'error');
    }
  }, [addToast, refetchAlertas]);

  const dismissItem = useCallback(async (id) => {
    try {
      await dismissAlertaApi(id);
      setAlertas((prev) => prev.filter((a) => a.id !== id));
      await refetchAlertas?.();
      addToast('Alerta dispensado.', 'success');
    } catch {
      addToast('Erro ao dispensar alerta.', 'error');
    }
  }, [addToast, refetchAlertas]);

  return {
    alertas,
    alertasFiltrados: alertas,
    metricas,
    pagination,
    loading,
    error,

    searchTerm,
    setSearchTerm,
    onSearchChange,
    filtros,
    setFiltros,
    selectFiltersConfig,
    activeFilters,

    clearFilter,
    clearAllFilters,
    goToPage,
    refetch,

    updateStatus,
    dismissAlerta: dismissItem,
  };
}
