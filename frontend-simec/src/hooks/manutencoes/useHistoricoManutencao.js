import { useCallback, useEffect, useState } from 'react';
import { getHistoricoManutencao } from '@/services/api';

export function useHistoricoManutencao(manutencaoId) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    if (!manutencaoId) return;
    setLoading(true);
    try {
      const data = await getHistoricoManutencao(manutencaoId);
      setEventos(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [manutencaoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { eventos, loading };
}
