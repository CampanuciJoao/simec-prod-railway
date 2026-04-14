import { useState, useEffect, useCallback } from 'react';
import { getEquipamentoById, updateEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/errorUtils';

export function useEquipamentoDetalhes(equipamentoId) {
  const { addToast } = useToast();

  const [equipamento, setEquipamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const carregarEquipamento = useCallback(async () => {
    if (!equipamentoId) {
      setEquipamento(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getEquipamentoById(equipamentoId);
      setEquipamento(data || null);
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        'Falha ao carregar dados do equipamento.'
      );
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
    if (!equipamentoId) return false;

    setIsSubmitting(true);

    try {
      const updated = await updateEquipamento(equipamentoId, formData);
      setEquipamento(updated);
      addToast('Equipamento atualizado com sucesso!', 'success');
      return true;
    } catch (err) {
      addToast(
        getErrorMessage(err, 'Erro ao salvar alterações.'),
        'error'
      );
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
    refetch: carregarEquipamento,
  };
}