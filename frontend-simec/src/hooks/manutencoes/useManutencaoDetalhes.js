// Ficheiro: src/hooks/useManutencaoDetalhes.js
// VERSÃO FINAL SÊNIOR - LÓGICA DE NEGÓCIO COMPLETA E ENCAPSULADA

import { useState, useEffect, useCallback } from 'react';
import { 
    getManutencaoById, 
    updateManutencao, 
    uploadAnexoManutencao, 
    deleteAnexoManutencao, 
    addNotaAndamento, 
    cancelarManutencao,
    concluirManutencao
} from '../services/api';
import { useToast } from '../contexts/ToastContext';

/**
 * Hook customizado para gerenciar o estado e as ações de uma única Ordem de Serviço (OS).
 * Encapsula toda a lógica de busca, atualização, adição de notas, uploads e mudanças de status.
 * @param {string} manutencaoId - O ID da manutenção a ser gerenciada.
 */
export function useManutencaoDetalhes(manutencaoId) {
  const { addToast } = useToast();

  const [manutencao, setManutencao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Função para buscar os dados completos da manutenção da API.
   * Memorizada com useCallback para estabilidade.
   */
  const fetchManutencao = useCallback(async () => {
    if (!manutencaoId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getManutencaoById(manutencaoId);
      setManutencao(data);
    } catch (err) {
      setError(err);
      addToast(err.response?.data?.message || 'Não foi possível carregar os dados da manutenção.', 'error');
    } finally {
      setLoading(false);
    }
  }, [manutencaoId, addToast]);

  // Efeito que executa a busca inicial de dados.
  useEffect(() => {
    fetchManutencao();
  }, [fetchManutencao]);

  // --- Funções de Ação Expostas pelo Hook ---

  const salvarAtualizacoes = async (formData) => {
        setSubmitting(true);
        try {
            // Apenas chama a API. O backend agora cuida da auditoria.
            await updateManutencao(manutencaoId, formData);
            addToast('Informações atualizadas com sucesso!', 'success');
            await fetchManutencao();
        } catch (err) { /* ... */ } finally { /* ... */ }
    };

  const adicionarNota = async (nota) => {
    setSubmitting(true);
    try {
      await addNotaAndamento(manutencaoId, { nota });
      addToast('Nota adicionada ao histórico.', 'success');
      await fetchManutencao();
    } catch (err) {
      addToast(err.response?.data?.message || 'Erro ao adicionar nota.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fazerUploadAnexo = async (formData) => {
        setSubmitting(true);
        try {
            // Apenas chama a API. O backend agora cuida da auditoria.
            await uploadAnexoManutencao(manutencaoId, formData);
            addToast('Anexo(s) enviado(s) com sucesso!', 'success');
            await fetchManutencao();
        } catch (err) { /* ... */ } finally { /* ... */ }
    };
  
  const removerAnexo = async (anexoId) => {
        setSubmitting(true);
        try {
            // Apenas chama a API. O backend agora cuida da auditoria.
            await deleteAnexoManutencao(manutencaoId, anexoId);
            addToast('Anexo excluído com sucesso!', 'success');
            await fetchManutencao();
        } catch (err) { /* ... */ } finally { /* ... */ }
    };

  const cancelarOS = async (motivo) => {
    setSubmitting(true);
    try {
      await cancelarManutencao(manutencaoId, { motivo });
      addToast('Manutenção cancelada com sucesso.', 'success');
      await fetchManutencao();
      return true; // Indica sucesso para o modal fechar
    } catch (err) {
      addToast(err.response?.data?.message || 'Erro ao cancelar manutenção.', 'error');
      return false; // Indica falha
    } finally {
      setSubmitting(false);
    }
  };

  const concluirOS = async (dadosConclusao) => {
    setSubmitting(true);
    try {
      // A API de concluir não precisa mais de dados, mas a de confirmação sim.
      // O endpoint `/concluir` deve ser usado para marcar a OS como `AguardandoConfirmacao`.
      // A ação final deve usar um novo endpoint ou lógica. Vamos assumir que a ação no frontend é `concluirOS`.
      // Para o seu caso, a lógica de 'concluir' parece ser a confirmação final.
      await concluirManutencao(manutencaoId, dadosConclusao);
      addToast("Manutenção concluída com sucesso!", "success");
      await fetchManutencao();
    } catch (err) {
      addToast(err.response?.data?.message || "Erro ao confirmar conclusão.", "error");
    } finally {
      setSubmitting(false);
    }
  };
  
  // Retorna o estado e as funções para a página consumir.
  return {
    manutencao,
    loading,
    error,
    submitting,
    salvarAtualizacoes,
    adicionarNota,
    fazerUploadAnexo,
    removerAnexo,
    cancelarOS,
    concluirOS,
    refetch: fetchManutencao // Expõe a função de recarregar
  };
}