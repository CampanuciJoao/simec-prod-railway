import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useToast } from '@/contexts/ToastContext';
import {
  addManutencao,
  getEquipamentos,
  getManutencaoById,
  getUnidades,
  updateManutencao,
} from '@/services/api';

export function useSalvarManutencaoPage() {
  const { manutencaoId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = Boolean(manutencaoId);

  const [initialData, setInitialData] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Mensagem do ultimo erro de submit — exibida inline acima do botao
  // pra garantir feedback visivel (toast some rapido e pode passar
  // despercebido em forms longos).
  const [submitError, setSubmitError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos({ page: 1, pageSize: 500, sortBy: 'modelo', sortDirection: 'asc' }),
        getUnidades(),
      ]);

      setEquipamentos(equipamentosData?.items || []);
      setUnidades(unidadesData || []);

      if (isEditing) {
        const manutencao = await getManutencaoById(manutencaoId);
        setInitialData(manutencao);
      }
    } catch (err) {
      const mensagem =
        err?.response?.data?.message ||
        'Falha ao carregar os dados necessarios.';

      setError(mensagem);
      addToast(mensagem, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, isEditing, manutencaoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = useCallback(
    async (formData) => {
      try {
        setSubmitting(true);
        setSubmitError('');

        if (isEditing) {
          await updateManutencao(manutencaoId, formData);
          addToast('Manutencao atualizada com sucesso!', 'success');
        } else {
          await addManutencao(formData);
          addToast('Manutencao agendada com sucesso!', 'success');
        }

        navigate('/manutencoes', { state: { refresh: true } });
      } catch (err) {
        const mensagem =
          err?.response?.data?.message || 'Erro ao salvar a manutencao.';

        // Mostra inline (persistente) E como toast (transiente). Sem
        // rethrow — quem chama trata pelos states (submitError +
        // submitting=false), evita unhandled promise rejection no console.
        setSubmitError(mensagem);
        addToast(mensagem, 'error');
      } finally {
        setSubmitting(false);
      }
    },
    [addToast, isEditing, manutencaoId, navigate]
  );

  const goBack = useCallback(() => {
    navigate('/manutencoes');
  }, [navigate]);

  return {
    isEditing,
    initialData,
    equipamentos,
    unidades,
    loading,
    submitting,
    error,
    submitError,
    handleSave,
    goBack,
  };
}
