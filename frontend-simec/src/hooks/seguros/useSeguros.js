import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSeguros, getUnidades, deleteSeguro } from '../../services/api';

const getNomeUnidade = (seguro) => {
  if (typeof seguro.unidade === 'string') return seguro.unidade;
  if (seguro.unidade?.nomeSistema) return seguro.unidade.nomeSistema;
  if (seguro.unidade?.nome) return seguro.unidade.nome;
  if (seguro.equipamento?.unidade?.nomeSistema) {
    return seguro.equipamento.unidade.nomeSistema;
  }
  return '';
};

const getStatusDinamico = (seguro) => {
  if (!seguro) return '';

  if (seguro.status && seguro.status !== 'Ativo') return seguro.status;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataFim = new Date(seguro.dataFim);

  if (Number.isNaN(dataFim.getTime())) return seguro.status || 'Ativo';
  if (dataFim < hoje) return 'Expirado';

  const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'Vence em breve';

  return 'Ativo';
};

export function useSeguros() {
  const [seguros, setSeguros] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    seguradora: '',
    status: '',
    unidade: '',
  });

  const [sortConfig, setSortConfig] = useState({
    key: 'dataFim',
    direction: 'ascending',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [segurosData, unidadesData] = await Promise.all([
        getSeguros(),
        getUnidades(),
      ]);

      setSeguros(Array.isArray(segurosData) ? segurosData : []);
      setUnidades(Array.isArray(unidadesData) ? unidadesData : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const segurosFiltradosEOrdenados = useMemo(() => {
    let items = [...seguros];

    if (searchTerm) {
      const termo = searchTerm.toLowerCase();

      items = items.filter(
        (s) =>
          s.apoliceNumero?.toLowerCase().includes(termo) ||
          s.nomeVinculo?.toLowerCase().includes(termo) ||
          s.seguradora?.toLowerCase().includes(termo)
      );
    }

    if (filtros.seguradora) {
      items = items.filter((s) => s.seguradora === filtros.seguradora);
    }

    if (filtros.status) {
      items = items.filter((s) => getStatusDinamico(s) === filtros.status);
    }

    if (filtros.unidade) {
      items = items.filter((s) => getNomeUnidade(s) === filtros.unidade);
    }

    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (sortConfig.key.toLowerCase().includes('data')) {
          return sortConfig.direction === 'ascending'
            ? new Date(valA) - new Date(valB)
            : new Date(valB) - new Date(valA);
        }

        return sortConfig.direction === 'ascending'
          ? String(valA || '').localeCompare(String(valB || ''), 'pt-BR', {
              sensitivity: 'base',
            })
          : String(valB || '').localeCompare(String(valA || ''), 'pt-BR', {
              sensitivity: 'base',
            });
      });
    }

    return items;
  }, [seguros, searchTerm, filtros, sortConfig]);

  const removerSeguro = useCallback(
    async (id) => {
      await deleteSeguro(id);
      await fetchData();
    },
    [fetchData]
  );

  return {
    seguros: segurosFiltradosEOrdenados,
    unidadesDisponiveis: unidades,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    sortConfig,
    setSortConfig,
    removerSeguro,
    refetch: fetchData,
    getNomeUnidade,
    getStatusDinamico,
  };
}