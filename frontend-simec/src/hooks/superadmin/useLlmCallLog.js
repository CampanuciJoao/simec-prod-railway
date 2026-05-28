import { useCallback, useEffect, useState } from 'react';
import {
  obterResumoLlm,
  listarPorTenantLlm,
  listarPorFeatureLlm,
  obterSerieDiariaLlm,
} from '@/services/api/superadminLlmCallLogApi';

// Hook do painel de custo LLM. Carrega todas as 4 visoes em paralelo.
// Sem polling — dado eh histórico, refresh manual basta.
//
// Filtro de periodo: { de, ate } em ISO string. Default: ultimos 30 dias
// (decidido no backend).

export function useLlmCallLog(filtros = {}) {
  const [resumo, setResumo] = useState(null);
  const [porTenant, setPorTenant] = useState([]);
  const [porFeature, setPorFeature] = useState([]);
  const [serieDiaria, setSerieDiaria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, t, f, s] = await Promise.all([
        obterResumoLlm(filtros),
        listarPorTenantLlm(filtros),
        listarPorFeatureLlm(filtros),
        obterSerieDiariaLlm(filtros),
      ]);
      setResumo(r);
      setPorTenant(t);
      setPorFeature(f);
      setSerieDiaria(s);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          'Não foi possível carregar dados de custo LLM.'
      );
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    resumo,
    porTenant,
    porFeature,
    serieDiaria,
    loading,
    error,
    recarregar: carregar,
  };
}
