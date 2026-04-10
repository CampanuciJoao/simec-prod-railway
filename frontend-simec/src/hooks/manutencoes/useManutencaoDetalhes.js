// Ficheiro: src/hooks/manutencoes/useManutencaoDetalhes.js
// VERSÃO FINAL SÊNIOR - LÓGICA DE NEGÓCIO COMPLETA E ENCAPSULADA

import { useState, useEffect, useCallback } from 'react';
import {
  getManutencaoById,
  updateManutencao,
  uploadAnexoManutencao,
  deleteAnexoManutencao,
  addNotaAndamento,
  cancelarManutencao,
  concluirManutencao,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

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

  const fetchManutencao = useCallback(async () => {
    if (!manutencaoId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getManutencaoById(manutencaoId);
      setManutencao(data);
    } catch (err) {
      setError(err);
      addToast(
        err.response?.data?.message ||
          'Não foi possível carregar os dados da manutenção.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [manutencaoId, addToast]);

  useEffect(() => {
    fetchManutencao();
  }, [fetchManutencao]);

  const salvarAtualizacoes = async (formData) => {
    setSubmitting(true);

    try {
      await updateManutencao(manutencaoId, formData);
      addToast('Informações atualizadas com sucesso!', 'success');
      await fetchManutencao();
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Erro ao salvar alterações.',
        'error'
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const adicionarNota = async (nota) => {
    setSubmitting(true);

    try {
      await addNotaAndamento(manutencaoId, { nota });
      addToast('Nota adicionada ao histórico.', 'success');
      await fetchManutencao();
    } catch (err) {
      addToast(err.response?.data?.message || 'Erro ao adicionar nota.', 'error');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const fazerUploadAnexo = async (formData) => {
    setSubmitting(true);

    try {
      await uploadAnexoManutencao(manutencaoId, formData);
      addToast('Anexo(s) enviado(s) com sucesso!', 'success');
      await fetchManutencao();
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Erro ao enviar anexo(s).',
        'error'
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const removerAnexo = async (anexoId) => {
    setSubmitting(true);

    try {
      await deleteAnexoManutencao(manutencaoId, anexoId);
      addToast('Anexo excluído com sucesso!', 'success');
      await fetchManutencao();
    } catch (err) {
      addToast(err.response?.data?.message || 'Erro ao excluir anexo.', 'error');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const cancelarOS = async (motivo) => {
    setSubmitting(true);

    try {
      await cancelarManutencao(manutencaoId, { motivo });
      addToast('Manutenção cancelada com sucesso.', 'success');
      await fetchManutencao();
      return true;
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Erro ao cancelar manutenção.',
        'error'
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const concluirOS = async (dadosConclusao) => {
    setSubmitting(true);

    try {
      await concluirManutencao(manutencaoId, dadosConclusao);
      addToast('Manutenção concluída com sucesso!', 'success');
      await fetchManutencao();
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Erro ao confirmar conclusão.',
        'error'
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

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
    refetch: fetchManutencao,
  };
}