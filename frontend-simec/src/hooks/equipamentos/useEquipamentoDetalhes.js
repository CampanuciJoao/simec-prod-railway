// Ficheiro: src/hooks/useEquipamentoDetalhes.js
// VERSÃO FINAL SIMPLIFICADA

import { useState, useEffect, useCallback } from 'react';
import { getEquipamentoById, updateEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export function useEquipamentoDetalhes(equipamentoId) {
  const { addToast } = useToast();
  const [equipamento, setEquipamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const carregarEquipamento = useCallback(async () => {
    if (!equipamentoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEquipamentoById(equipamentoId);
      setEquipamento(data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Falha ao carregar dados do equipamento.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, addToast]);

  useEffect(() => {
    carregarEquipamento();
  }, [carregarEquipamento]);

  const salvarAlteracoes = async (formData) => {
    setIsSubmitting(true);
    try {
      const updated = await updateEquipamento(equipamentoId, formData);
      setEquipamento(updated);
      addToast('Equipamento atualizado com sucesso!', 'success');
      return true;
    } catch (err) {
      addToast(err.response?.data?.message || 'Erro ao salvar alterações.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return {
    equipamento,
    loading,
    isSubmitting,
    error,
    salvarAlteracoes,
    refetch: carregarEquipamento
  };
}