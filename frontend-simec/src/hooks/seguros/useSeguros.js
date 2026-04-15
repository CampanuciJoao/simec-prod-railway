import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSeguros, getUnidades, deleteSeguro } from '../../services/api';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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

  if (seguro.status && seguro.status !== 'Ativo') {
    return seguro.status;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataFim = new Date(seguro.dataFim);

  if (Number.isNaN(dataFim.getTime())) {
    return seguro.status || 'Ativo';
  }

  if (dataFim < hoje) {
    return 'Expirado';
  }

  const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) {
    return 'Vence em breve';
  }

  return 'Ativo';
}

function compareValues(a, b, direction = 'ascending') {
  const dir = direction === 'descending' ? -1 : 1;

  const valueA = a ?? '';
  const valueB = b ?? '';

  const dateA =
    typeof valueA === 'string' && !Number.isNaN(Date.parse(valueA))
      ? new Date(valueA).getTime()
      : null;

  const dateB =
    typeof valueB === 'string' && !Number.isNaN(Date.parse(valueB))
      ? new Date(valueB).getTime()
      : null;

  if (dateA !== null && dateB !== null) {
    return dateA > dateB ? dir : dateA < dateB ? -dir : 0;
  }

  return normalizeText(valueA).localeCompare(normalizeText(valueB), 'pt-BR') * dir;
}

export function useSeguros() {
  const [segurosOriginais, setSegurosOriginais] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setError('');

      const [segurosData, unidadesData] = await Promise.all([
        getSeguros(),
        getUnidades(),
      ]);

      setSegurosOriginais(Array.isArray(segurosData) ? segurosData : []);
      setUnidades(Array.isArray(unidadesData) ? unidadesData : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao carregar seguros.'
      );
      setSegurosOriginais([]);
      setUnidades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const seguros = useMemo(() => {
    let items = [...segurosOriginais];

    if (searchTerm) {
      const termo = normalizeText(searchTerm);

      items = items.filter((seguro) => {
        const searchable = [
          seguro.apoliceNumero,
          seguro.nomeVinculo,
          seguro.seguradora,
          getNomeUnidadeSeguro(seguro),
          seguro.tipoSeguro,
          getStatusDinamicoSeguro(seguro),
        ]
          .filter(Boolean)
          .join(' ');

        return normalizeText(searchable).includes(termo);
      });
    }

    if (filtros.seguradora) {
      items = items.filter((s) => s.seguradora === filtros.seguradora);
    }

    if (filtros.status) {
      items = items.filter((s) => getStatusDinamicoSeguro(s) === filtros.status);
    }

    if (filtros.unidade) {
      items = items.filter((s) => getNomeUnidadeSeguro(s) === filtros.unidade);
    }

    if (sortConfig?.key) {
      items.sort((a, b) => {
        const valA =
          sortConfig.key === 'status'
            ? getStatusDinamicoSeguro(a)
            : sortConfig.key === 'unidade'
              ? getNomeUnidadeSeguro(a)
              : a?.[sortConfig.key];

        const valB =
          sortConfig.key === 'status'
            ? getStatusDinamicoSeguro(b)
            : sortConfig.key === 'unidade'
              ? getNomeUnidadeSeguro(b)
              : b?.[sortConfig.key];

        return compareValues(valA, valB, sortConfig.direction);
      });
    }

    return items;
  }, [segurosOriginais, searchTerm, filtros, sortConfig]);

  const removerSeguro = useCallback(
    async (id) => {
      await deleteSeguro(id);
      setSegurosOriginais((prev) => prev.filter((item) => item.id !== id));
    },
    []
  );

  return {
    seguros,
    segurosOriginais,
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
    getNomeUnidade: getNomeUnidadeSeguro,
    getStatusDinamico: getStatusDinamicoSeguro,
  };
}