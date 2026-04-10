// Ficheiro: src/hooks/equipamentos/useAcessorios.js
// VERSÃO FINAL SÊNIOR - HOOK DE LÓGICA DE NEGÓCIO

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import {
  getAcessoriosPorEquipamento,
  addAcessorio,
  updateAcessorio,
  deleteAcessorio,
} from '../../services/api';

export function useAcessorios(equipamentoId) {
  const { addToast } = useToast();

  const [acessorios, setAcessorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const carregarAcessorios = useCallback(async () => {
    if (!equipamentoId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getAcessoriosPorEquipamento(equipamentoId);
      setAcessorios(data || []);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Erro ao carregar acessórios.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, addToast]);

  useEffect(() => {
    carregarAcessorios();
  }, [carregarAcessorios]);

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

      await carregarAcessorios();
      return true;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        'Ocorreu um erro ao salvar o acessório.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const removerAcessorio = async (acessorioId) => {
    setSubmitting(true);
    setError(null);

    try {
      await deleteAcessorio(equipamentoId, acessorioId);
      addToast('Acessório removido com sucesso!', 'success');
      setAcessorios((prev) => prev.filter((acc) => acc.id !== acessorioId));
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Erro ao remover acessório.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    acessorios,
    loading,
    submitting,
    error,
    salvarAcessorio,
    removerAcessorio,
  };
}