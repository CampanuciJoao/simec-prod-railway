import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { getEquipamentoById, addEquipamento, updateEquipamento } from '../../services/api';

export function useSalvarEquipamentoPage() {
  const { equipamentoId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = !!equipamentoId;

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');

  const fetchEquipamento = useCallback(async () => {
    if (!isEditing || !equipamentoId) return;

    setLoading(true);
    setError('');

    try {
      const data = await getEquipamentoById(equipamentoId);
      setInitialData(data);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Erro ao carregar dados do equipamento.';

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
    try {
      if (isEditing) {
        await updateEquipamento(equipamentoId, formData);
        addToast('Equipamento atualizado com sucesso!', 'success');
      } else {
        await addEquipamento(formData);
        addToast('Equipamento adicionado com sucesso!', 'success');
      }

      setTimeout(() => {
        navigate('/equipamentos');
      }, 1000);
    } catch (apiError) {
      const errorMessage =
        apiError.response?.data?.message ||
        apiError.message ||
        'Erro desconhecido ao salvar.';

      addToast(errorMessage, 'error');
      throw apiError;
    }
  };

  const goBack = () => {
    navigate('/equipamentos');
  };

  return {
    equipamentoId,
    isEditing,
    initialData,
    loading,
    error,
    handleSave,
    goBack,
  };
}