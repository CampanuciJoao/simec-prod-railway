import { useCallback, useEffect, useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { getOsCorretivas, excluirOsCorretiva } from '../../services/api/osCorretivaApi';
import { useToast } from '../../contexts/ToastContext';

const PAGE_SIZE = 12;

export function useOsCorretiva() {
  const { addToast } = useToast();

  const [osCorretivas, setOsCorretivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [metricas, setMetricas] = useState({
    total: 0,
    abertas: 0,
    emAndamento: 0,
    aguardandoTerceiro: 0,
    concluidas: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasNextPage: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({ tipo: '', status: '' });

  const fetchOsCorretivas = useCallback(
    async ({ page = 1, append = false } = {}) => {
      try {
        append ? setLoadingMore(true) : setLoading(true);
        setError('');

        const data = await getOsCorretivas({
          page,
          pageSize: PAGE_SIZE,
          search: searchTerm || undefined,
          tipo: filtros.tipo || undefined,
          status: filtros.status || undefined,
        });

        const items = Array.isArray(data?.items) ? data.items : [];
        setOsCorretivas((prev) => (append ? [...prev, ...items] : items));
        setMetricas(data?.metricas || { total: 0, abertas: 0, emAndamento: 0, aguardandoTerceiro: 0, concluidas: 0 });
        setPagination({
          page: data?.page || page,
          pageSize: data?.pageSize || PAGE_SIZE,
          total: data?.total || items.length,
          hasNextPage: Boolean(data?.hasNextPage),
        });
      } catch (err) {
        const msg = err?.response?.data?.message || 'Não foi possível carregar as OS Corretivas.';
        setError(msg);
        if (!append) setOsCorretivas([]);
        addToast(msg, 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [addToast, filtros, searchTerm]
  );

  const debouncedFetch = useMemo(
    () => debounce(() => fetchOsCorretivas({ page: 1, append: false }), 250),
    [fetchOsCorretivas]
  );

  useEffect(() => {
    debouncedFetch();
    return () => debouncedFetch.cancel?.();
  }, [debouncedFetch]);

  const handleSearchChange = useCallback((eventOrValue) => {
    const value = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue?.target?.value || '';
    setSearchTerm(value);
  }, []);

  const handleFilterChange = useCallback((campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const removerOs = useCallback(
    async (id) => {
      try {
        await excluirOsCorretiva(id);
        addToast('OS Corretiva excluída com sucesso.', 'success');
        fetchOsCorretivas({ page: 1, append: false });
      } catch (err) {
        const msg = err?.response?.data?.message || 'Erro ao excluir OS Corretiva.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, fetchOsCorretivas]
  );

  const carregarMais = useCallback(async () => {
    if (loadingMore || !pagination.hasNextPage) return;
    await fetchOsCorretivas({ page: pagination.page + 1, append: true });
  }, [fetchOsCorretivas, loadingMore, pagination]);

  return {
    osCorretivas,
    loading,
    loadingMore,
    error,
    searchTerm,
    filtros,
    metricas,
    pagination,
    carregarMais,
    removerOs,
    refetch: () => fetchOsCorretivas({ page: 1, append: false }),
    handleSearchChange,
    handleFilterChange,
  };
}
