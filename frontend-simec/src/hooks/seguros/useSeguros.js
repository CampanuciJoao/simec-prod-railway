import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';

import { getSeguros, getUnidades, deleteSeguro } from '../../services/api';

export function getNomeUnidadeSeguro(seguro) {
  if (typeof seguro?.unidade === 'string') return seguro.unidade;
  if (seguro?.unidade?.nomeSistema) return seguro.unidade.nomeSistema;
  if (seguro?.unidade?.nome) return seguro.unidade.nome;
  if (seguro?.equipamento?.unidade?.nomeSistema) {
    return seguro.equipamento.unidade.nomeSistema;
  }
  return '';
}

export function getStatusDinamicoSeguro(seguro) {
  if (!seguro) return '';
  if (seguro.status && seguro.status !== 'Ativo') return seguro.status;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataFim = new Date(seguro.dataFim);
  if (Number.isNaN(dataFim.getTime())) return seguro.status || 'Ativo';
  if (dataFim < hoje) return 'Expirado';
  const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));
  return diffDays <= 30 ? 'Vence em breve' : 'Ativo';
}

const PAGE_SIZE = 15;

const FILTROS_INICIAL = { seguradora: '', status: '', unidade: '', tipoSeguro: '' };

export function useSeguros() {
  const [seguros, setSeguros] = useState([]);
  const [metricas, setMetricas] = useState({ total: 0, ativos: 0, vencendo: 0, vencidos: 0 });
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
      const res = await getSeguros({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: filt.status || undefined,
        seguradora: filt.seguradora || undefined,
        unidade: filt.unidade || undefined,
        tipoSeguro: filt.tipoSeguro || undefined,
      });

      setSeguros(Array.isArray(res.data) ? res.data : []);
      setMetricas(res.metricas ?? { total: 0, ativos: 0, vencendo: 0, vencidos: 0 });
      setPagination({ page: res.page, totalPages: res.totalPages, total: res.total });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao carregar seguros.');
      setSeguros([]);
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

  const removerSeguro = useCallback(
    async (id) => {
      await deleteSeguro(id);
      const { page, search, filtros: filt } = paramsRef.current;
      await fetchPage(page, search, filt);
    },
    [fetchPage]
  );

  return {
    seguros,
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
    removerSeguro,
    getNomeUnidade: getNomeUnidadeSeguro,
    getStatusDinamico: getStatusDinamicoSeguro,
  };
}
