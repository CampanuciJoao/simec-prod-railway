import { useCallback, useEffect, useRef, useState } from 'react';
import { getSaudeSistema } from '@/services/api/saudeApi';

const POLL_INTERVAL_MS = 15_000;

export function useSaude() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const pollRef = useRef(null);

  const carregar = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getSaudeSistema();
      setSnapshot(data);
      setAtualizadoEm(new Date());
      setError(null);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          'Não foi possível carregar o snapshot de saúde.'
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    pollRef.current = setInterval(() => carregar({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [carregar]);

  return {
    snapshot,
    loading,
    error,
    atualizadoEm,
    recarregar: () => carregar(),
  };
}
