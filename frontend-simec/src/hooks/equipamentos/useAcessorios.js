// Ficheiro: src/hooks/useAcessorios.js
// VERSÃO FINAL SÊNIOR - HOOK DE LÓGICA DE NEGÓCIO

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { 
    getAcessoriosPorEquipamento, 
    addAcessorio,
    updateAcessorio,
    deleteAcessorio
} from '../../services/api';

/**
 * Hook customizado para gerir o ciclo de vida completo dos acessórios de um equipamento.
 * Encapsula a lógica de busca, criação, atualização, exclusão e gestão de estado (loading, erro).
 * @param {string | undefined} equipamentoId - O ID do equipamento pai. O hook aguarda um ID válido para agir.
 */
export function useAcessorios(equipamentoId) {
  // --- Hooks ---
  const { addToast } = useToast();
  
  // --- Estado Interno ---
  const [acessorios, setAcessorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // --- Funções Memorizadas ---

  /**
   * Função para carregar os acessórios da API.
   * Memorizada com `useCallback` para evitar recriações desnecessárias.
   */
  const carregarAcessorios = useCallback(async () => {
    if (!equipamentoId) {
      setLoading(false);
      return; // Prevenção: não faz nada se não houver um ID de equipamento.
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await getAcessoriosPorEquipamento(equipamentoId);
      setAcessorios(data || []); // Garante que o estado seja sempre um array.
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao carregar acessórios.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, addToast]);

  /**
   * Efeito que dispara a carga inicial de dados quando o hook é montado ou o ID do equipamento muda.
   */
  useEffect(() => {
    carregarAcessorios();
  }, [carregarAcessorios]);

  /**
   * Função unificada para criar ou atualizar um acessório.
   * @param {object} formData - Os dados do formulário.
   * @param {string|null} editingId - O ID do acessório a ser editado, ou null para criar um novo.
   * @returns {Promise<boolean>} - Retorna true em caso de sucesso, false em caso de falha.
   */
  const salvarAcessorio = async (formData, editingId) => {
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await updateAcessorio(equipamentoId, editingId, formData);
        addToast('Acessório atualizado com sucesso!', 'success');
      } else {
        await addAcessorio(equipamentoId, formData);
        addToast('Acessório adicionado com sucesso!', 'success');
      }
      await carregarAcessorios(); // Recarrega a lista para refletir as mudanças.
      return true; // Indica sucesso para o componente da página.
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Ocorreu um erro ao salvar o acessório.';
      setError(errorMessage); // Define o erro para ser exibido no formulário.
      addToast(errorMessage, 'error');
      return false; // Indica falha.
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Função para remover um acessório.
   * @param {string} acessorioId - O ID do acessório a ser removido.
   */
  const removerAcessorio = async (acessorioId) => {
    setSubmitting(true); // Pode ser usado para desabilitar todos os botões de ação enquanto remove.
    setError(null);
    try {
        await deleteAcessorio(equipamentoId, acessorioId);
        addToast('Acessório removido com sucesso!', 'success');
        
        // Otimização de UI: Remove o item da lista localmente para uma resposta visual instantânea.
        setAcessorios(prevAcessorios => prevAcessorios.filter(acc => acc.id !== acessorioId));
    } catch (err) {
        const errorMessage = err.response?.data?.message || 'Erro ao remover acessório.';
        setError(errorMessage);
        addToast(errorMessage, 'error');
    } finally {
        setSubmitting(false);
    }
  };

  // --- Retorno ---
  // Expõe o estado e as funções para serem consumidos pelos componentes.
  return { 
    acessorios, 
    loading, 
    submitting, 
    error, 
    salvarAcessorio, 
    removerAcessorio 
  };
}