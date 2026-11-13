import { useState, useEffect, useCallback } from 'react';
import { listarTestesCq, restaurarTesteCq } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

export function useTestesExcluidos() {
  const { addToast } = useToast();
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

  // Restaura sem confirmar — a confirmacao fica no componente consumidor
  // via ModalConfirmacao (padrao do sistema). Nunca usar window.confirm.
  const restaurar = useCallback(async (t) => {
    setRestaurandoId(t.id);
    try {
      await restaurarTesteCq(t.id);
      await carregar();
      addToast(`Teste ${t.tipoTeste?.codigo || ''} restaurado.`, 'success');
    } catch (e) {
      addToast(e?.response?.data?.message || 'Erro ao restaurar.', 'error');
    } finally {
      setRestaurandoId(null);
    }
  }, [carregar, addToast]);

  return {
    testes,
    loading,
    error,
    restaurandoId,
    restaurar,
  };
}
