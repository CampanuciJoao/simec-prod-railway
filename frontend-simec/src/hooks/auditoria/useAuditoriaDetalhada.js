// Ficheiro: src/hooks/useAuditoriaDetalhada.js

import { useState, useEffect, useCallback } from 'react';
import { getLogAuditoria } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export function useAuditoriaDetalhada(entidade, entidadeId) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!entidade || !entidadeId) return;
    setLoading(true);
    try {
      // A API já espera um objeto com a propriedade 'params'
      const data = await getLogAuditoria({ entidade, entidadeId });
      setLogs(data || []);
    } catch (err) {
      addToast('Erro ao carregar log de auditoria.', 'error');
    } finally {
      setLoading(false);
    }
  }, [entidade, entidadeId, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}