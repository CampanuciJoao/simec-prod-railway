import { useState, useEffect, useCallback } from 'react';
import {
  getSeguroById,
  getSeguroHistorico,
  cancelarSeguro,
  deleteSeguro,
} from '@/services/api';

export function useDetalhesSeguroPage(id) {
  const [seguro, setSeguro] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const fetchSeguro = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const data = await getSeguroById(id);
      setSeguro(data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao carregar detalhes do seguro.'
      );
      setSeguro(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchHistorico = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingHistorico(true);
      const data = await getSeguroHistorico(id);
      // Remove o próprio seguro atual da lista (já está sendo exibido)
      setHistorico(Array.isArray(data) ? data.slice(1) : []);
    } catch {
      setHistorico([]);
    } finally {
      setLoadingHistorico(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSeguro();
    fetchHistorico();
  }, [fetchSeguro, fetchHistorico]);

  const handleCancelar = useCallback(async (motivo) => {
    setCancelando(true);
    try {
      const atualizado = await cancelarSeguro(id, motivo);
      setSeguro(atualizado);
    } finally {
      setCancelando(false);
    }
  }, [id]);

  const handleExcluir = useCallback(async () => {
    setExcluindo(true);
    try {
      await deleteSeguro(id);
    } finally {
      setExcluindo(false);
    }
  }, [id]);

  return {
    seguro,
    historico,
    loading,
    loadingHistorico,
    error,
    cancelando,
    excluindo,
    refetch: fetchSeguro,
    handleCancelar,
    handleExcluir,
  };
}
