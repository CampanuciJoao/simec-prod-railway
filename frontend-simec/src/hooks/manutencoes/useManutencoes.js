import { useCallback, useEffect, useMemo, useState } from 'react';
import debounce from 'lodash/debounce';

import {
  deleteManutencao,
  getManutencoes,
  getUnidades,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

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
    status: filtros.status || undefined,
    tipo: filtros.tipo || undefined,
    unidadeId: filtros.unidadeId || undefined,
    sortBy: sortConfig.key || 'dataHoraAgendamentoInicio',
    sortDirection:
      sortConfig.direction === 'ascending' ? 'asc' : 'desc',
  };
}

export function useManutencoes() {
  const { addToast } = useToast();

  const [manutencoes, setManutencoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [metricas, setMetricas] = useState({
    total: 0,
    emAndamento: 0,
    aguardando: 0,
    concluidas: 0,
    canceladas: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasNextPage: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    status: '',
    tipo: '',
    unidadeId: '',
  });

  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'descending',
  });

  const fetchUnidades = useCallback(async () => {
    try {
      const unidades = await getUnidades();
      setUnidadesDisponiveis(Array.isArray(unidades) ? unidades : []);
    } catch (err) {
      console.error('[MANUTENCOES_UNIDADES_FETCH_ERROR]', err);
    }
  }, []);

  const fetchManutencoes = useCallback(
    async ({ page = 1, append = false } = {}) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        setError('');

        const data = await getManutencoes(
          buildQueryParams({
            searchTerm,
            filtros,
            sortConfig,
            page,
          })
        );

        const items = Array.isArray(data?.items) ? data.items : [];

        setManutencoes((prev) => (append ? [...prev, ...items] : items));
        setMetricas(
          data?.metricas || {
            total: data?.total || items.length,
            emAndamento: 0,
            aguardando: 0,
            concluidas: 0,
            canceladas: 0,
          }
        );
        setPagination({
          page: data?.page || page,
          pageSize: data?.pageSize || PAGE_SIZE,
          total: data?.total || items.length,
          hasNextPage: Boolean(data?.hasNextPage),
        });
      } catch (err) {
        const mensagem =
          err?.response?.data?.message || 'Não foi possível carregar as manutenções.';
        setError(mensagem);
        if (!append) {
          setManutencoes([]);
          setMetricas({
            total: 0,
            emAndamento: 0,
            aguardando: 0,
            concluidas: 0,
            canceladas: 0,
          });
        }
        addToast(mensagem, 'error');
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
        fetchManutencoes({ page, append: false });
      }, 250),
    [fetchManutencoes]
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

  const handleSearchChange = useCallback((eventOrValue) => {
    const value =
      typeof eventOrValue === 'string'
        ? eventOrValue
        : eventOrValue?.target?.value || '';

    setSearchTerm(value);
  }, []);

  const handleFilterChange = useCallback((campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }, []);

  const requestSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'ascending' ? 'descending' : 'ascending',
        };
      }

      return {
        key,
        direction: 'ascending',
      };
    });
  }, []);

  const removerManutencao = useCallback(
    async (id) => {
      if (!id) return;

      try {
        await deleteManutencao(id);
        addToast('Ordem de serviço excluída com sucesso.', 'success');
        fetchManutencoes({ page: 1, append: false });
      } catch (err) {
        const mensagem =
          err?.response?.data?.message || 'Erro ao excluir a ordem de serviço.';
        addToast(mensagem, 'error');
        throw err;
      }
    },
    [addToast, fetchManutencoes]
  );

  const carregarMais = useCallback(async () => {
    if (loadingMore || !pagination.hasNextPage) return;

    await fetchManutencoes({
      page: pagination.page + 1,
      append: true,
    });
  }, [fetchManutencoes, loadingMore, pagination]);

  const controles = useMemo(
    () => ({
      handleSearchChange,
      handleFilterChange,
      sortConfig,
      requestSort,
    }),
    [handleSearchChange, handleFilterChange, sortConfig, requestSort]
  );

  return {
    manutencoes,
    manutencoesOriginais: manutencoes,
    loading,
    loadingMore,
    error,
    searchTerm,
    filtros,
    metricas,
    unidadesDisponiveis,
    pagination,
    carregarMais,
    removerManutencao,
    refetch: () => fetchManutencoes({ page: 1, append: false }),
    controles,
  };
}
