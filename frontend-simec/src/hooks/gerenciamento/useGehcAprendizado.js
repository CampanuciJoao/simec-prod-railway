// Hook que carrega o estado completo da sub-aba "Aprendizado da IA":
// status (KPIs), pipelines (kill switch + pausas), equipamentos (cobertura),
// e atividade recente. Tudo em paralelo. Re-fetch automatico a cada 60s
// para refletir progresso do worker noturno sem o usuario apertar nada.

import { useEffect, useState, useCallback } from 'react';
import {
  getAprendizadoStatus,
  getAprendizadoEquipamentos,
  getAprendizadoAtividade,
  getAprendizadoPipelines,
  getAprendizadoCausas,
  getAprendizadoInsights,
  patchInsightFeedback,
  patchInsightResolver,
  postPausarPipeline,
  postRetomarPipeline,
} from '@/services/api/gehcAprendizadoApi';

const REFRESH_INTERVAL_MS = 60_000;

export function useGehcAprendizado() {
  const [status, setStatus]               = useState(null);
  const [pipelines, setPipelines]         = useState([]);
  const [equipamentos, setEquipamentos]   = useState([]);
  const [atividade, setAtividade]         = useState([]);
  const [causas, setCausas]               = useState([]);
  const [insights, setInsights]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [acaoPipeline, setAcaoPipeline]   = useState({}); // { [pipeline]: 'pausando'|'retomando' }

  const carregar = useCallback(async () => {
    try {
      setError(null);
      const [s, ps, eqs, atv, cs, ins] = await Promise.all([
        getAprendizadoStatus(),
        getAprendizadoPipelines(),
        getAprendizadoEquipamentos(),
        getAprendizadoAtividade(),
        getAprendizadoCausas(),
        getAprendizadoInsights(),
      ]);
      setStatus(s);
      setPipelines(ps?.pipelines || []);
      setEquipamentos(eqs?.equipamentos || []);
      setAtividade(atv?.itens || []);
      setCausas(cs?.categorias || []);
      setInsights(ins?.insights || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const darFeedbackInsight = useCallback(async (id, util) => {
    try {
      await patchInsightFeedback(id, util);
      await carregar();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    }
  }, [carregar]);

  const resolverInsight = useCallback(async (id) => {
    try {
      await patchInsightResolver(id);
      await carregar();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    }
  }, [carregar]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [carregar]);

  const pausar = useCallback(async (pipeline, { motivo, escopo = 'tenant' } = {}) => {
    setAcaoPipeline((s) => ({ ...s, [pipeline]: 'pausando' }));
    try {
      await postPausarPipeline(pipeline, { motivo, escopo });
      await carregar();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setAcaoPipeline((s) => {
        const novo = { ...s };
        delete novo[pipeline];
        return novo;
      });
    }
  }, [carregar]);

  const retomar = useCallback(async (pipeline, { escopo = 'tenant' } = {}) => {
    setAcaoPipeline((s) => ({ ...s, [pipeline]: 'retomando' }));
    try {
      await postRetomarPipeline(pipeline, { escopo });
      await carregar();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setAcaoPipeline((s) => {
        const novo = { ...s };
        delete novo[pipeline];
        return novo;
      });
    }
  }, [carregar]);

  return {
    status, pipelines, equipamentos, atividade, causas, insights,
    loading, error,
    acaoPipeline,
    pausar, retomar,
    darFeedbackInsight, resolverInsight,
    recarregar: carregar,
  };
}
