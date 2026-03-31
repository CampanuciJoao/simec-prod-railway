// Ficheiro: src/hooks/useEquipamentos.js
// VERSÃO 6.1 - ADICIONADO EXPORTAÇÃO DE REFETCH PARA ATUALIZAÇÃO DE ANEXOS

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getEquipamentos, getUnidades, deleteEquipamento } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export const useEquipamentos = () => {
  const [equipamentosOriginais, setEquipamentosOriginais] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  // Estados para Busca, Filtros de Coluna e Ordenação
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({ unidadeId: '', tipo: '', fabricante: '', status: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'modelo', direction: 'ascending' });

  // 1. BUSCA DE DADOS (API) - Agora memorizada e exportada como refetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [equipData, unidadesData] = await Promise.all([
        getEquipamentos(),
        getUnidades()
      ]);
      setEquipamentosOriginais(equipData || []);
      setUnidadesDisponiveis(unidadesData || []);
    } catch (err) {
      setError(err);
      addToast('Erro ao carregar dados dos equipamentos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 2. LÓGICA DE FILTRAGEM (SEARCH + SELECTS)
  const equipamentosFiltrados = useMemo(() => {
    let filtrados = [...equipamentosOriginais];

    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      filtrados = filtrados.filter(e =>
        e.modelo.toLowerCase().includes(termo) ||
        e.tag.toLowerCase().includes(termo) ||
        e.unidade?.nomeSistema.toLowerCase().includes(termo)
      );
    }

    if (filtros.unidadeId) filtrados = filtrados.filter(e => e.unidadeId === filtros.unidadeId);
    if (filtros.tipo) filtrados = filtrados.filter(e => e.tipo === filtros.tipo);
    if (filtros.fabricante) filtrados = filtrados.filter(e => e.fabricante === filtros.fabricante);
    if (filtros.status) filtrados = filtrados.filter(e => e.status === filtros.status);

    return filtrados;
  }, [equipamentosOriginais, searchTerm, filtros]);

  // 3. LÓGICA DE ORDENAÇÃO
  const equipamentosOrdenados = useMemo(() => {
    let ordenados = [...equipamentosFiltrados];

    if (sortConfig.key) {
      ordenados.sort((a, b) => {
        let valA, valB;

        if (sortConfig.key === 'unidade') {
          valA = a.unidade?.nomeSistema || '';
          valB = b.unidade?.nomeSistema || '';
        } else {
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
        }

        if (sortConfig.key === 'dataInstalacao' || sortConfig.key === 'createdAt') {
          const dataA = valA ? new Date(valA).getTime() : 0;
          const dataB = valB ? new Date(valB).getTime() : 0;
          return sortConfig.direction === 'ascending' ? dataA - dataB : dataB - dataA;
        }

        if (sortConfig.key === 'anoFabricacao') {
            const numA = Number(valA) || 0;
            const numB = Number(valB) || 0;
            return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();

        if (strA < strB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return ordenados;
  }, [equipamentosFiltrados, sortConfig]);

  // 4. FUNÇÕES DE CONTROLE
  const requestSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  return {
    equipamentos: equipamentosOrdenados,
    unidadesDisponiveis,
    loading,
    error,
    setFiltros,
    refetch: fetchData, // <<< ADICIONADO: Agora a página pode chamar esta função
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
        addToast('Equipamento excluído!', 'success');
        fetchData();
      } catch (err) { addToast('Erro ao excluir.', 'error'); }
    },
    atualizarStatusLocalmente: (id, status) => {
      setEquipamentosOriginais(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    },
  };
};