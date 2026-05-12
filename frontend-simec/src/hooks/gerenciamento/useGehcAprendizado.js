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
  postLimparTodosInsights,
  postPausarPipeline,
  postRetomarPipeline,
  postDispararPipeline,
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
  const [acaoPipeline, setAcaoPipeline]   = useState({}); // { [pipeline]: 'pausando'|'retomando'|'disparando' }
  // Feedback inline pos-acao: { [pipeline]: { tipo: 'success'|'error', mensagem, expira } }
  // Auto-clear via setTimeout. Componente renderiza abaixo do nome do pipeline.
  const [feedbackPipeline, setFeedbackPipeline] = useState({});

  // Tempo estimado de execucao por pipeline (afeta apenas a mensagem de
  // feedback — nao bloqueia nada). Captura PDF e o mais lento porque envolve
  // login Playwright + 1-3s por OS + ate 50 OSs.
  const TEMPO_ESTIMADO = {
    gehc_captura_pdf:    '2 a 5 minutos',
    gehc_extracao_pdf:   '1 a 3 minutos',
    knowledge_layer:     '10 a 30 segundos',
    ia_embeddings:       '30 segundos a 2 minutos',
    ia_insights:         '5 a 15 segundos',
  };

  function setFeedback(pipeline, tipo, mensagem, ttlMs = 60_000) {
    setFeedbackPipeline((s) => ({
      ...s,
      [pipeline]: { tipo, mensagem, expira: Date.now() + ttlMs },
    }));
    setTimeout(() => {
      setFeedbackPipeline((s) => {
        const novo = { ...s };
        if (novo[pipeline]?.expira <= Date.now()) delete novo[pipeline];
        return novo;
      });
    }, ttlMs + 100);
  }

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

  const limparTodosInsights = useCallback(async (motivo) => {
    try {
      const r = await postLimparTodosInsights(motivo);
      await carregar();
      return r;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      throw err;
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

  const disparar = useCallback(async (pipeline) => {
    setAcaoPipeline((s) => ({ ...s, [pipeline]: 'disparando' }));
    try {
      const r = await postDispararPipeline(pipeline);
      const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const tempoEstimado = TEMPO_ESTIMADO[pipeline] || 'alguns minutos';
      setFeedback(
        pipeline,
        'success',
        `Job enfileirado às ${horario} (id: ${r?.jobId?.slice(-8) || 'n/a'}). Execução em ${tempoEstimado} — atualize a página depois para ver os resultados.`,
        90_000,
      );
      // Aguarda alguns segundos antes de recarregar — da tempo do worker
      // pegar o job e o estado refletir nas KPIs.
      setTimeout(() => carregar(), 4000);
    } catch (err) {
      const mensagem = err?.response?.data?.error || err.message;
      setFeedback(pipeline, 'error', `Falha ao enfileirar: ${mensagem}`, 30_000);
    } finally {
      setTimeout(() => {
        setAcaoPipeline((s) => {
          const novo = { ...s };
          delete novo[pipeline];
          return novo;
        });
      }, 1500);
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
    feedbackPipeline,
    pausar, retomar, disparar,
    darFeedbackInsight, resolverInsight, limparTodosInsights,
    recarregar: carregar,
  };
}
