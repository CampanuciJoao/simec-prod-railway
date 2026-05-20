import { useState, useEffect, useCallback } from 'react';
import { listarTestesCq, restaurarTesteCq } from '@/services/api';

export function useTestesExcluidos() {
  const [testes, setTestes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restaurandoId, setRestaurandoId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarTestesCq({ incluirDeletados: 'true', pageSize: 200 });
      const items = (data?.items || []).filter((t) => !!t.deletadoEm);
      setTestes(items);
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar excluídos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const restaurar = useCallback(async (t) => {
    if (!confirm(`Restaurar teste ${t.tipoTeste?.codigo}?`)) return;
    setRestaurandoId(t.id);
    try {
      await restaurarTesteCq(t.id);
      await carregar();
    } catch (e) {
      alert(e?.response?.data?.message || 'Erro ao restaurar.');
    } finally {
      setRestaurandoId(null);
    }
  }, [carregar]);

  return {
    testes,
    loading,
    error,
    restaurandoId,
    restaurar,
  };
}
