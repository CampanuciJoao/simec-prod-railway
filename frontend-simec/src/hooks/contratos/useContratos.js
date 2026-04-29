import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';

import { getContratos, getUnidades, deleteContrato } from '../../services/api';
export { getDynamicStatus } from '../../utils/contratos';

const PAGE_SIZE = 10;

const FILTROS_INICIAL = { categoria: '', status: '', unidade: '' };

export function useContratos() {
  const [contratos, setContratos] = useState([]);
  const [metricas, setMetricas] = useState({ total: 0, ativos: 0, vencendo: 0, expirados: 0 });
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INICIAL);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const paramsRef = useRef({ page: 1, search: '', filtros: FILTROS_INICIAL });

  useEffect(() => {
    getUnidades()
      .then((data) => setUnidades(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchPage = useCallback(async (page, search, filt) => {
    setLoading(true);
    setError('');
    try {
      const res = await getContratos({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: filt.status || undefined,
        categoria: filt.categoria || undefined,
        unidade: filt.unidade || undefined,
      });

      setContratos(Array.isArray(res.data) ? res.data : []);
      setMetricas(res.metricas ?? { total: 0, ativos: 0, vencendo: 0, expirados: 0 });
      setPagination({ page: res.page, totalPages: res.totalPages, total: res.total });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao carregar contratos.');
      setContratos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetch = useMemo(
    () => debounce((page, search, filt) => fetchPage(page, search, filt), 300),
    [fetchPage]
  );

  useEffect(() => {
    paramsRef.current = { page: 1, search: searchTerm, filtros };
    debouncedFetch(1, searchTerm, filtros);
    return () => debouncedFetch.cancel();
  }, [searchTerm, filtros, debouncedFetch]);

  const goToPage = useCallback(
    (newPage) => {
      paramsRef.current = { ...paramsRef.current, page: newPage };
      fetchPage(newPage, paramsRef.current.search, paramsRef.current.filtros);
    },
    [fetchPage]
  );

  const removerContrato = useCallback(
    async (id) => {
      await deleteContrato(id);
      const { page, search, filtros: filt } = paramsRef.current;
      await fetchPage(page, search, filt);
    },
    [fetchPage]
  );

  return {
    contratos,
    metricas,
    unidadesDisponiveis: unidades,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    pagination,
    goToPage,
    removerContrato,
    refetch: () => {
      const { page, search, filtros: filt } = paramsRef.current;
      return fetchPage(page, search, filt);
    },
  };
}
