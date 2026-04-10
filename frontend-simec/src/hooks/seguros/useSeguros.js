// frontend-simec/src/hooks/useSeguros.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSeguros, getUnidades, deleteSeguro } from '../../services/api';

export function useSeguros() {
  const [seguros, setSeguros] = useState([]);
  const [unidades, setUnidades] = useState([]); // <-- Novo estado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({ seguradora: '', status: '', unidade: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'dataFim', direction: 'ascending' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [segurosData, unidadesData] = await Promise.all([
        getSeguros(),
        getUnidades()
      ]);
      setSeguros(Array.isArray(segurosData) ? segurosData : []);
      setUnidades(unidadesData);
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
      items = items.filter(s =>
        s.apoliceNumero?.toLowerCase().includes(termo) ||
        s.nomeVinculo?.toLowerCase().includes(termo) ||
        s.seguradora?.toLowerCase().includes(termo)
      );
    }
    if (filtros.seguradora) items = items.filter(s => s.seguradora === filtros.seguradora);
    if (filtros.status) items = items.filter(s => s.status === filtros.status);
    if (filtros.unidade) items = items.filter(s => s.unidade === filtros.unidade);

    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (sortConfig.key.includes('data')) {
          return sortConfig.direction === 'ascending' ? new Date(valA) - new Date(valB) : new Date(valB) - new Date(valA);
        }
        return String(valA || '').localeCompare(String(valB || ''));
      });
    }
    return items;
  }, [seguros, searchTerm, filtros, sortConfig]);

  const removerSeguro = useCallback(async (id) => {
    await deleteSeguro(id);
    await fetchData();
  }, [fetchData]);

  return {
    seguros: segurosFiltradosEOrdenados,
    unidadesDisponiveis: unidades, // <-- Exporta para o filtro
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    sortConfig,
    setSortConfig,
    removerSeguro,
    refetch: fetchData
  };
}
