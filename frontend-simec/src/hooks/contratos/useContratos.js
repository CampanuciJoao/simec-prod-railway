import { useState, useEffect, useCallback, useMemo } from 'react';
import { getContratos, getUnidades, deleteContrato } from '../../services/api';
import { getDynamicStatus } from '../../utils/contratos';

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function compareValues(a, b, direction = 'ascending') {
  const dir = direction === 'descending' ? -1 : 1;

  const valorA = a ?? '';
  const valorB = b ?? '';

  if (typeof valorA === 'number' && typeof valorB === 'number') {
    return valorA > valorB ? dir : valorA < valorB ? -dir : 0;
  }

  const dataA =
    valorA instanceof Date
      ? valorA.getTime()
      : typeof valorA === 'string' && !Number.isNaN(Date.parse(valorA))
        ? new Date(valorA).getTime()
        : null;

  const dataB =
    valorB instanceof Date
      ? valorB.getTime()
      : typeof valorB === 'string' && !Number.isNaN(Date.parse(valorB))
        ? new Date(valorB).getTime()
        : null;

  if (dataA !== null && dataB !== null) {
    return dataA > dataB ? dir : dataA < dataB ? -dir : 0;
  }

  const textoA = normalizarTexto(valorA);
  const textoB = normalizarTexto(valorB);

  return textoA > textoB ? dir : textoA < textoB ? -dir : 0;
}

function getSortValue(contrato, key) {
  switch (key) {
    case 'numeroContrato':
      return contrato?.numeroContrato;
    case 'fornecedor':
      return contrato?.fornecedor;
    case 'categoria':
      return contrato?.categoria;
    case 'status':
      return getDynamicStatus(contrato);
    case 'dataInicio':
      return contrato?.dataInicio;
    case 'dataFim':
      return contrato?.dataFim;
    default:
      return contrato?.[key];
  }
}

const PAGE_SIZE_CONTRATOS = 10;

export function useContratos() {
  const [contratosOriginais, setContratosOriginais] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    categoria: '',
    status: '',
    unidade: '',
  });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: 'dataFim',
    direction: 'ascending',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [contratosData, unidadesData] = await Promise.all([
        getContratos(),
        getUnidades(),
      ]);

      setContratosOriginais(Array.isArray(contratosData) ? contratosData : []);
      setUnidades(Array.isArray(unidadesData) ? unidadesData : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar contratos.'
      );
      setContratosOriginais([]);
      setUnidades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const contratosFiltrados = useMemo(() => {
    const termo = normalizarTexto(searchTerm);

    return contratosOriginais.filter((contrato) => {
      if (termo) {
        const camposBusca = [
          contrato?.numeroContrato,
          contrato?.fornecedor,
          contrato?.categoria,
          getDynamicStatus(contrato),
          ...(contrato?.unidadesCobertas || []).map((u) => u?.nomeSistema),
        ];

        const textoBusca = normalizarTexto(camposBusca.filter(Boolean).join(' '));

        if (!textoBusca.includes(termo)) {
          return false;
        }
      }

      if (filtros.categoria && contrato?.categoria !== filtros.categoria) {
        return false;
      }

      if (filtros.status && getDynamicStatus(contrato) !== filtros.status) {
        return false;
      }

      if (filtros.unidade) {
        const possuiUnidade = contrato?.unidadesCobertas?.some(
          (u) => String(u.id) === String(filtros.unidade)
        );

        if (!possuiUnidade) {
          return false;
        }
      }

      return true;
    });
  }, [contratosOriginais, searchTerm, filtros]);

  const contratos = useMemo(() => {
    const items = [...contratosFiltrados];

    if (!sortConfig?.key) {
      return items;
    }

    return items.sort((a, b) => {
      const valA = getSortValue(a, sortConfig.key);
      const valB = getSortValue(b, sortConfig.key);

      return compareValues(valA, valB, sortConfig.direction);
    });
  }, [contratosFiltrados, sortConfig]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => { setPage(1); }, [searchTerm, filtros, sortConfig]);

  const contratosPaginados = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE_CONTRATOS;
    return contratos.slice(start, start + PAGE_SIZE_CONTRATOS);
  }, [contratos, page]);

  const totalPages = Math.ceil(contratos.length / PAGE_SIZE_CONTRATOS) || 1;

  const removerContrato = useCallback(async (id) => {
    await deleteContrato(id);
    setContratosOriginais((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    contratos: contratosPaginados,
    contratosOriginais,
    unidadesDisponiveis: unidades,
    loading,
    error,
    pagination: { page, totalPages, total: contratos.length },
    goToPage: setPage,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    sortConfig,
    setSortConfig,
    removerContrato,
    refetch: fetchData,
  };
}