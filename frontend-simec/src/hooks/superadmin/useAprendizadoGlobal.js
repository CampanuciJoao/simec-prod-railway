import { useCallback, useEffect, useState } from 'react';
import {
  getVisaoGlobalAprendizado,
  getAprendizadoPorTenant,
  getPipelinesGlobais,
} from '@/services/api/superadminAprendizadoApi';

export function useAprendizadoGlobal() {
  const [visao, setVisao] = useState(null);
  const [porTenant, setPorTenant] = useState([]);
  const [pipelinesGlobais, setPipelinesGlobais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [v, p, g] = await Promise.all([
        getVisaoGlobalAprendizado(),
        getAprendizadoPorTenant(),
        getPipelinesGlobais(),
      ]);
      setVisao(v);
      setPorTenant(p?.tenants || []);
      setPipelinesGlobais(g?.pipelines || []);
      setAtualizadoEm(new Date());
      setError(null);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          'Não foi possível carregar a visão de aprendizado da IA.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    visao,
    porTenant,
    pipelinesGlobais,
    loading,
    error,
    atualizadoEm,
    recarregar: carregar,
  };
}
