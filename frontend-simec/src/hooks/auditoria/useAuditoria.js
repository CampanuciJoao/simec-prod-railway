import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import debounce from 'lodash/debounce';

import { getLogAuditoria, getFiltrosAuditoria } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

export function useAuditoria() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    hasNextPage: false,
  });

  const [filtros, setFiltros] = useState({
    autorId: '',
    acao: '',
    entidade: '',
    entidadeId: '',
    dataInicio: '',
    dataFim: '',
  });

  const [opcoesFiltro, setOpcoesFiltro] = useState({
    usuarios: [],
    acoes: [],
    entidades: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(
    debounce(async (currentFilters, page = 1) => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = Object.fromEntries(
          Object.entries(currentFilters).filter(
            ([, value]) => value != null && value !== ''
          )
        );

        params.page = page;
        params.limit = 50;

        const data = await getLogAuditoria(params);

        setLogs((prevLogs) =>
          page === 1 ? data.logs || [] : [...prevLogs, ...(data.logs || [])]
        );

        setPagination({
          page: data?.pagination?.page || page,
          hasNextPage: Boolean(data?.pagination?.hasNextPage),
        });
      } catch (error) {
        addToast('Erro ao carregar os logs de auditoria.', 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }, 300),
    [addToast]
  );

  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const data = await getFiltrosAuditoria();

        setOpcoesFiltro({
          usuarios: Array.isArray(data?.usuarios) ? data.usuarios : [],
          acoes: Array.isArray(data?.acoes) ? data.acoes : [],
          entidades: Array.isArray(data?.entidades) ? data.entidades : [],
        });
      } catch (error) {
        addToast('Erro ao carregar opções de filtro.', 'error');
      }
    };

    carregarOpcoes();
  }, [addToast]);

  useEffect(() => {
    const { filtroEntidade, filtroEntidadeId } = location.state || {};

    if (filtroEntidade && filtroEntidadeId) {
      setFiltros((prev) => ({
        ...prev,
        entidade: filtroEntidade,
        entidadeId: filtroEntidadeId,
      }));

      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    setPagination({ page: 1, hasNextPage: false });
    fetchLogs(filtros, 1);
  }, [filtros, fetchLogs]);

  const carregarMaisLogs = () => {
    if (!loadingMore && pagination.hasNextPage) {
      fetchLogs(filtros, pagination.page + 1);
    }
  };

  return {
    logs,
    loading,
    loadingMore,
    pagination,
    filtros,
    setFiltros,
    opcoesFiltro,
    carregarMaisLogs,
  };
}