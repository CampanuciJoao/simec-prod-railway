import { useCallback, useEffect, useState } from 'react';
import { getGehcResumoEquipamento, getGehcSnapshots } from '@/services/api/gehcApi';

export function useGehcSaude(equipamentoId) {
  const [resumo, setResumo]       = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const carregar = useCallback(async () => {
    if (!equipamentoId) return;
    setLoading(true);
    setError(null);
    try {
      const [res, snap] = await Promise.allSettled([
        getGehcResumoEquipamento(equipamentoId),
        getGehcSnapshots(equipamentoId, 30),
      ]);
      if (res.status === 'fulfilled') setResumo(res.value);
      else setError(res.reason?.response?.data?.error ?? 'Erro ao carregar dados GE.');
      if (snap.status === 'fulfilled') setSnapshots(snap.value.snapshots ?? []);
    } catch (err) {
      setError(err?.response?.data?.error ?? err.message);
    } finally {
      setLoading(false);
    }
  }, [equipamentoId]);

  useEffect(() => { carregar(); }, [carregar]);

  return { resumo, snapshots, loading, error, refetch: carregar };
}
