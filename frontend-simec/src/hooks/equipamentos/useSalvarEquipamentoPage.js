import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import {
  getEquipamentoById,
  addEquipamento,
  updateEquipamento,
} from '../../services/api';
import { getErrorMessage } from '../../utils/errorUtils';

export function useSalvarEquipamentoPage() {
  const { equipamentoId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = Boolean(equipamentoId);

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchEquipamento = useCallback(async () => {
    if (!isEditing || !equipamentoId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getEquipamentoById(equipamentoId);
      setInitialData(data || null);
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        'Erro ao carregar dados do equipamento.'
      );

      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, isEditing, addToast]);

  useEffect(() => {
    fetchEquipamento();
  }, [fetchEquipamento]);

  const handleSave = async (formData) => {
    setSaving(true);
    setError('');

    try {
      if (isEditing) {
        await updateEquipamento(equipamentoId, formData);
        addToast('Equipamento atualizado com sucesso!', 'success');
      } else {
        await addEquipamento(formData);
        addToast('Equipamento cadastrado com sucesso!', 'success');
      }

      navigate('/equipamentos');
      return true;
    } catch (apiError) {
      const errorMessage = getErrorMessage(
        apiError,
        'Erro ao salvar equipamento.'
      );

      setError(errorMessage);
      addToast(errorMessage, 'error');
      throw apiError;
    } finally {
      setSaving(false);
    }
  };

  const goBackToEquipamentos = useCallback(() => {
    navigate('/equipamentos');
  }, [navigate]);

  const goBackToCadastros = useCallback(() => {
    navigate('/cadastros');
  }, [navigate]);

  return {
    equipamentoId,
    isEditing,
    initialData,
    loading,
    saving,
    error,
    handleSave,
    goBackToEquipamentos,
    goBackToCadastros,
    refetch: fetchEquipamento,
  };
}