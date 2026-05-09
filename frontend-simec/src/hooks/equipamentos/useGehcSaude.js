import { useCallback, useEffect, useRef, useState } from 'react';
import { getGehcResumoEquipamento, getGehcSnapshots } from '@/services/api/gehcApi';

export function useGehcSaude(equipamentoId) {
  const [resumo, setResumo]       = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const abortRef = useRef(null);

  const carregar = useCallback(async () => {
    if (!equipamentoId) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    setError(null);
    try {
      const [res, snap] = await Promise.allSettled([
        getGehcResumoEquipamento(equipamentoId, { signal }),
        getGehcSnapshots(equipamentoId, 30, { signal }),
      ]);
      if (signal.aborted) return;
      if (res.status === 'fulfilled') setResumo(res.value);
      else setError(res.reason?.response?.data?.error ?? 'Erro ao carregar dados GE.');
      if (snap.status === 'fulfilled') setSnapshots(snap.value.snapshots ?? []);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
      setError(err?.response?.data?.error ?? err.message);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [equipamentoId]);

  useEffect(() => {
    carregar();
    return () => abortRef.current?.abort();
  }, [carregar]);

  return { resumo, snapshots, loading, error, refetch: carregar };
}
