import { useState, useEffect, useCallback } from 'react';
import { getSeguroById } from '@/services/api';

export function useDetalhesSeguroPage(id) {
  const [seguro, setSeguro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchSeguro();
  }, [fetchSeguro]);

  return {
    seguro,
    loading,
    error,
    refetch: fetchSeguro,
  };
}