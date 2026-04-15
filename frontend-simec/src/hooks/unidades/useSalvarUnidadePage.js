import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  addUnidade,
  getUnidadeById,
  updateUnidade,
} from '@/services/api';

import { useToast } from '@/contexts/ToastContext';

export function useSalvarUnidadePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addToast } = useToast();

  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');

  const fetchUnidade = useCallback(async () => {
    if (!isEditing) return;

    try {
      setLoading(true);
      setError('');

      const data = await getUnidadeById(id);
      setInitialData(data || null);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao carregar unidade.';

      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, addToast]);

  useEffect(() => {
    fetchUnidade();
  }, [fetchUnidade]);

  const handleSubmit = useCallback(
    async (formData) => {
      try {
        if (isEditing) {
          await updateUnidade(id, formData);
          addToast('Unidade atualizada com sucesso!', 'success');
        } else {
          await addUnidade(formData);
          addToast('Unidade cadastrada com sucesso!', 'success');
        }

        navigate('/cadastros/unidades');
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Erro ao salvar unidade.';

        addToast(message, 'error');
        throw err;
      }
    },
    [id, isEditing, navigate, addToast]
  );

  const goBackToMenu = useCallback(() => {
    navigate('/cadastros');
  }, [navigate]);

  const goBackToList = useCallback(() => {
    navigate('/cadastros/unidades');
  }, [navigate]);

  return {
    isEditing,
    initialData,
    loading,
    error,
    handleSubmit,
    goBackToMenu,
    goBackToList,
  };
}