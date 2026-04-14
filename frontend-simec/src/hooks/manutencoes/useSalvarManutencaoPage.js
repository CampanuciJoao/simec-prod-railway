// src/hooks/manutencoes/useSalvarManutencaoPage.js

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

import {
  getManutencaoById,
  addManutencao,
  updateManutencao,
  getEquipamentos,
  getUnidades,
} from '../../services/api';

export function useSalvarManutencaoPage() {
  const { manutencaoId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = Boolean(manutencaoId);

  const [initialData, setInitialData] = useState(null);
  const [equipamentos, setEquipamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * =========================
   * FETCH DATA
   * =========================
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos(),
        getUnidades(),
      ]);

      setEquipamentos(equipamentosData || []);
      setUnidades(unidadesData || []);

      if (isEditing) {
        const manutencao = await getManutencaoById(manutencaoId);
        setInitialData(manutencao);
      }
    } catch (err) {
      const mensagem =
        err?.response?.data?.message ||
        'Falha ao carregar dados necessários.';

      setError(mensagem);
      addToast(mensagem, 'error');
    } finally {
      setLoading(false);
    }
  }, [isEditing, manutencaoId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * =========================
   * SAVE
   * =========================
   */
  const handleSave = useCallback(
    async (formData) => {
      try {
        if (isEditing) {
          await updateManutencao(manutencaoId, formData);
          addToast('Manutenção atualizada com sucesso!', 'success');
        } else {
          await addManutencao(formData);
          addToast('Manutenção agendada com sucesso!', 'success');
        }

        navigate('/manutencoes', { state: { refresh: true } });
      } catch (err) {
        const mensagem =
          err?.response?.data?.message ||
          'Erro ao salvar a manutenção.';

        addToast(mensagem, 'error');
        throw err;
      }
    },
    [isEditing, manutencaoId, navigate, addToast]
  );

  /**
   * =========================
   * NAV
   * =========================
   */
  const goBack = useCallback(() => {
    navigate('/manutencoes');
  }, [navigate]);

  return {
    isEditing,
    initialData,
    equipamentos,
    unidades,
    loading,
    error,
    handleSave,
    goBack,
  };
}