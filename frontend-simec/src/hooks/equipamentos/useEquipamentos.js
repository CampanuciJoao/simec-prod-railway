import { useState, useEffect, useMemo, useCallback } from 'react';
import debounce from 'lodash/debounce';

import {
  deleteEquipamento,
  getEquipamentos,
  getUnidades,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

const PAGE_SIZE = 12;

function buildQueryParams({
  searchTerm,
  filtros,
  sortConfig,
  page,
}) {
  return {
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
    unidadeId: filtros.unidadeId || undefined,
    tipo: filtros.tipo || undefined,
    fabricante: filtros.fabricante || undefined,
    status: filtros.status || undefined,
    sortBy: sortConfig.key || 'modelo',
    sortDirection:
      sortConfig.direction === 'descending' ? 'desc' : 'asc',
  };
}

export const useEquipamentos = () => {
  const { addToast } = useToast();

  const [equipamentos, setEquipamentos] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    tipos: [],
    fabricantes: [],
  });
  const [metricas, setMetricas] = useState({
    total: 0,
    operantes: 0,
    emManutencao: 0,
    inoperantes: 0,
    usoLimitado: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    unidadeId: '',
    tipo: '',
    fabricante: '',
    status: '',
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'modelo',
    direction: 'ascending',
  });

  const fetchUnidades = useCallback(async () => {
    try {
      const unidadesData = await getUnidades();
      setUnidadesDisponiveis(unidadesData || []);
    } catch (err) {
      console.error('[EQUIPAMENTOS_UNIDADES_FETCH_ERROR]', err);
    }
  }, []);

  const fetchData = useCallback(
    async ({ page = 1, append = false } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await getEquipamentos(
          buildQueryParams({
            searchTerm,
            filtros,
            sortConfig,
            page,
          })
        );

        const items = Array.isArray(response?.items) ? response.items : [];

        setEquipamentos((prev) => (append ? [...prev, ...items] : items));
        setMetricas(
          response?.metricas || {
            total: response?.total || items.length,
            operantes: 0,
            emManutencao: 0,
            inoperantes: 0,
            usoLimitado: 0,
          }
        );
        setFilterOptions({
          tipos: Array.isArray(response?.filters?.tipos)
            ? response.filters.tipos
            : [],
          fabricantes: Array.isArray(response?.filters?.fabricantes)
            ? response.filters.fabricantes
            : [],
        });
        setPagination({
          page: response?.page || page,
          pageSize: response?.pageSize || PAGE_SIZE,
          total: response?.total || items.length,
          hasNextPage: Boolean(response?.hasNextPage),
        });
      } catch (err) {
        const errorMessage = getErrorMessage(
          err,
          'Erro ao carregar dados dos equipamentos.'
        );

        setError(errorMessage);
        if (!append) {
          setEquipamentos([]);
          setMetricas({
            total: 0,
            operantes: 0,
            emManutencao: 0,
            inoperantes: 0,
            usoLimitado: 0,
          });
        }
        addToast(errorMessage, 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [addToast, filtros, searchTerm, sortConfig]
  );

  const debouncedFetch = useMemo(
    () =>
      debounce((page = 1) => {
        fetchData({ page, append: false });
      }, 250),
    [fetchData]
  );

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  useEffect(() => {
    debouncedFetch(1);

    return () => {
      debouncedFetch.cancel?.();
    };
  }, [debouncedFetch]);

  const requestSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    }));
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const carregarMais = useCallback(async () => {
    if (loadingMore || !pagination.hasNextPage) return;

    await fetchData({
      page: pagination.page + 1,
      append: true,
    });
  }, [fetchData, loadingMore, pagination]);

  return {
    equipamentos,
    unidadesDisponiveis,
    filterOptions,
    metricas,
    pagination,
    loading,
    loadingMore,
    error,
    setFiltros,
    refetch: () => fetchData({ page: 1, append: false }),
    carregarMais,
    controles: {
      searchTerm,
      filtros,
      sortConfig,
      handleSearchChange,
      handleFilterChange,
      requestSort,
    },
    removerEquipamento: async (id) => {
      try {
        await deleteEquipamento(id);
        addToast('Equipamento excluido!', 'success');
        fetchData({ page: 1, append: false });
      } catch {
        addToast('Erro ao excluir.', 'error');
      }
    },
    atualizarStatusLocalmente: (id, status) => {
      setEquipamentos((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );
    },
  };
};
