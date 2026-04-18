import { useState, useEffect, useCallback } from 'react';

import { getLogAuditoria } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

export function useAuditoriaDetalhada(entidade, entidadeId) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!entidade || !entidadeId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await getLogAuditoria({
        entidade,
        entidadeId,
        page: 1,
        limit: 100,
      });

      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch {
      addToast('Erro ao carregar log de auditoria.', 'error');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [entidade, entidadeId, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    refetch: fetchLogs,
  };
}
