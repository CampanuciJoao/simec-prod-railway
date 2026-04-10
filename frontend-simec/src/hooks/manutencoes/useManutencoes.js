// Ficheiro: src/hooks/useManutencoes.js
// VERSÃO FINAL SÊNIOR - COM NOME DE EXPORTAÇÃO CORRETO E LÓGICA COMPLETA

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getManutencoes, getEquipamentos, getUnidades, deleteManutencao } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

/**
 * Hook customizado para gerenciar a lógica da página de listagem de Manutenções.
 * Encapsula a busca de dados, filtragem, ordenação e ações.
 */
export function useManutencoes() {
  // --- Estados ---
  const [manutencoes, setManutencoes] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({ equipamentoId: '', unidadeId: '', tipo: '', status: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'dataHoraAgendamentoInicio', direction: 'descending' });
  const { addToast } = useToast();

  // --- Busca de Dados ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Busca todos os dados necessários em paralelo para otimizar o carregamento.
      const [manutencoesData, equipamentosData, unidadesData] = await Promise.all([
        getManutencoes(),
        getEquipamentos(),
        getUnidades()
      ]);
      
      setManutencoes(manutencoesData || []);
      setEquipamentos(equipamentosData || []);
      setUnidades(unidadesData || []);

    } catch (err) {
      setError(err);
      addToast(err.response?.data?.message || 'Falha ao carregar dados de manutenções.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Efeito que busca os dados na primeira montagem do componente.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Lógica de Filtragem e Ordenação ---
  const manutencoesProcessadas = useMemo(() => {
    let items = [...manutencoes];

    // Filtro de busca textual
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      items = items.filter(m => 
        m.numeroOS?.toLowerCase().includes(termo) ||
        m.equipamento?.modelo?.toLowerCase().includes(termo) ||
        m.equipamento?.tag?.toLowerCase().includes(termo)
      );
    }

    // Filtros de <select>
    if (filtros.unidadeId) items = items.filter(m => m.equipamento?.unidadeId === filtros.unidadeId);
    if (filtros.equipamentoId) items = items.filter(m => m.equipamentoId === filtros.equipamentoId);
    if (filtros.tipo) items = items.filter(m => m.tipo === filtros.tipo);
    if (filtros.status) items = items.filter(m => m.status === filtros.status);
    
    // Ordenação
    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = sortConfig.key === 'equipamento' ? a.equipamento?.modelo : a[sortConfig.key];
        const valB = sortConfig.key === 'equipamento' ? b.equipamento?.modelo : b[sortConfig.key];

        if (sortConfig.key.includes('data') || sortConfig.key.includes('Data')) {
          return sortConfig.direction === 'ascending' ? new Date(valA) - new Date(valB) : new Date(valB) - new Date(valA);
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
    }
    return items;
  }, [manutencoes, searchTerm, filtros, sortConfig]);
  
  // --- Ações ---
  const removerManutencao = async (id) => {
    try {
        await deleteManutencao(id);
        // Otimização: remove o item localmente para uma UI mais responsiva.
        setManutencoes(prev => prev.filter(m => m.id !== id));
    } catch (err) {
        addToast(err.response?.data?.message || 'Erro ao apagar manutenção.', 'error');
        // Em caso de erro, recarrega os dados para garantir consistência.
        fetchData();
    }
  };

  // --- Objeto de Retorno do Hook ---
  return {
    manutencoes: manutencoesProcessadas,
    equipamentos,
    unidadesDisponiveis: unidades,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtros,
    setFiltros,
    sortConfig,
    setSortConfig,
    removerManutencao,
    refetch: fetchData
  };
}