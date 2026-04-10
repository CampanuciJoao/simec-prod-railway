// frontend-simec/src/hooks/useUnidades.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getUnidades, deleteUnidade } from '../../services/api';

/**
 * Hook customizado para gerenciar a lógica da página de Unidades.
 * Busca, filtra, ordena e gerencia ações como a exclusão de unidades.
 */
export const useUnidades = () => {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nomeSistema', direction: 'ascending' });

  // Função para buscar os dados da API
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

  // Busca os dados quando o componente é montado
  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  // Aplica filtros e ordenação aos dados em memória para performance
  const unidadesFiltradasEOrdenadas = useMemo(() => {
    let items = [...unidades];
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      items = items.filter(u => 
        u.nomeSistema?.toLowerCase().includes(termo) || 
        u.nomeFantasia?.toLowerCase().includes(termo) ||
        u.cnpj?.includes(termo)
      );
    }

    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        const comparison = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return items;
  }, [unidades, searchTerm, sortConfig]);
  
  // Função para remover uma unidade
  const removerUnidade = useCallback(async (id) => {
    await deleteUnidade(id);
    await fetchUnidades(); // Recarrega os dados após a exclusão
  }, [fetchUnidades]);

  // Retorna os dados e as funções que a página irá usar
  return {
    unidades: unidadesFiltradasEOrdenadas,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    sortConfig,
    setSortConfig,
    removerUnidade,
    refetch: fetchUnidades
  };
};
