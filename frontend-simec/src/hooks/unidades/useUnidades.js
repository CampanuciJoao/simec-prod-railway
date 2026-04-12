import { useState, useEffect, useCallback, useMemo } from 'react';
import { getUnidades, deleteUnidade } from '../../services/api';

export const useUnidades = () => {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({
    cidade: '',
    estado: '',
  });

  const [sortConfig, setSortConfig] = useState({
    key: 'nomeSistema',
    direction: 'ascending',
  });

  const fetchUnidades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUnidades();
      setUnidades(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  const unidadesFiltradasEOrdenadas = useMemo(() => {
    let items = [...unidades];

    if (searchTerm) {
      const termo = searchTerm.toLowerCase();

      items = items.filter(
        (u) =>
          u.nomeSistema?.toLowerCase().includes(termo) ||
          u.nomeFantasia?.toLowerCase().includes(termo) ||
          u.cnpj?.includes(termo)
      );
    }

    if (filtros.cidade) {
      items = items.filter((u) => u.cidade === filtros.cidade);
    }

    if (filtros.estado) {
      items = items.filter((u) => u.estado === filtros.estado);
    }

    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';

        const comparison = String(valA).localeCompare(String(valB), 'pt-BR', {
          sensitivity: 'base',
        });

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }

    return items;
  }, [unidades, searchTerm, filtros, sortConfig]);

  const removerUnidade = useCallback(
    async (id) => {
      await deleteUnidade(id);
      await fetchUnidades();
    },
    [fetchUnidades]
  );

  return {
    unidades: unidadesFiltradasEOrdenadas,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    sortConfig,
    setSortConfig,
    removerUnidade,
    refetch: fetchUnidades,
  };
};