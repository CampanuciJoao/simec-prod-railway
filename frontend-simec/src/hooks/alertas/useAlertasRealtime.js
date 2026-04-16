import { useCallback, useEffect, useRef, useState } from 'react';
import { getAlertas } from '@/services/api';

function normalizarArray(data) {
  return Array.isArray(data) ? data : [];
}

function contarNaoVistos(alertas = []) {
  return alertas.filter((alerta) => alerta.status === 'NaoVisto').length;
}

export function useAlertasRealtime({
  enabled = true,
  intervalMs = 30000,
} = {}) {
  const [naoVistos, setNaoVistos] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  const fetchRealtimeAlertas = useCallback(async () => {
    try {
      setError('');
      const data = await getAlertas();
      const lista = normalizarArray(data);
      setNaoVistos(contarNaoVistos(lista));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao atualizar alertas em tempo real.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    fetchRealtimeAlertas();

    timerRef.current = setInterval(() => {
      fetchRealtimeAlertas();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, intervalMs, fetchRealtimeAlertas]);

  return {
    naoVistos,
    loading,
    error,
    refetch: fetchRealtimeAlertas,
  };
}