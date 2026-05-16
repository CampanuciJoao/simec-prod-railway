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
  patchInsightDescartar,
  postLimparTodosInsights,
  postDescartarTodosInsights,
  postResetarExtracoes,
  postPausarPipeline,
  postRetomarPipeline,
  postDispararPipeline,
  getJobStatus,
} from '@/services/api/gehcAprendizadoApi';

const REFRESH_INTERVAL_MS = 60_000;
// Polling do job apos disparo manual. 4s eh um equilibrio: rapido o
// suficiente para liberar o botao logo apos jobs curtos (5-30s), e nao
// agressivo o suficiente para sobrecarregar a API em jobs longos (5min).
const JOB_POLL_INTERVAL_MS = 4_000;
// gehc-capturar-pdfs leva ~20 min num ciclo cheio (limite=50, 5 PDFs por
// equipamento, Playwright + R2). Margem extra para evitar dar "timeout" no
// front enquanto o job ainda está rodando no worker.
// Limite duro: para o polling apos 15 min para nao deixar request aberto
// indefinidamente. O proximo refresh global (60s) vai capturar o resultado
// final via /pipelines mesmo se o polling acabar antes do job.
const JOB_POLL_TIMEOUT_MS = 30 * 60_000;

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
  // Timestamp (ms) em que a acao em curso comecou. Usado pelo botao para
  // exibir contador "Executando · 1m23s" enquanto o spinner roda.
  const [acaoIniciadaEm, setAcaoIniciadaEm] = useState({}); // { [pipeline]: number }
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

  const descartarInsight = useCallback(async (id) => {
    try {
      await patchInsightDescartar(id);
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

  const descartarTodosInsights = useCallback(async (motivo) => {
    try {
      const r = await postDescartarTodosInsights(motivo);
      await carregar();
      return r;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      throw err;
    }
  }, [carregar]);

  const resetarExtracoes = useCallback(async (motivo) => {
    try {
      const r = await postResetarExtracoes(motivo);
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

  // Helper: limpa o estado 'disparando' do pipeline. Usado em varios pontos do
  // ciclo de vida (sucesso, falha, timeout do polling).
  const liberarAcao = useCallback((pipeline) => {
    setAcaoPipeline((s) => {
      const novo = { ...s };
      delete novo[pipeline];
      return novo;
    });
    setAcaoIniciadaEm((s) => {
      const novo = { ...s };
      delete novo[pipeline];
      return novo;
    });
  }, []);

  // Polling do estado do job ate ele terminar (executando=false) ou ate
  // estourar JOB_POLL_TIMEOUT_MS. Mostra feedback de sucesso e recarrega os
  // KPIs quando o job conclui.
  const aguardarJobTerminar = useCallback(async (pipeline) => {
    const inicio = Date.now();
    let primeiraIteracao = true;
    while (Date.now() - inicio < JOB_POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS));
      try {
        const st = await getJobStatus(pipeline);
        if (!st?.executando) {
          // Pode ter terminado MUITO rapido (ja nao esta na fila quando
          // chegamos aqui). Na primeira iteracao toleramos isso — talvez o
          // worker ainda nao tinha pego. Da +1 ciclo de gracia.
          if (primeiraIteracao) { primeiraIteracao = false; continue; }
          return { ok: true };
        }
        primeiraIteracao = false;
      } catch (err) {
        // Erro de rede — nao desiste imediato; tenta de novo. Se persistir,
        // o timeout duro vai chutar para fora.
        primeiraIteracao = false;
      }
    }
    return { ok: false, motivo: 'timeout' };
  }, []);

  const disparar = useCallback(async (pipeline) => {
    setAcaoPipeline((s) => ({ ...s, [pipeline]: 'disparando' }));
    setAcaoIniciadaEm((s) => ({ ...s, [pipeline]: Date.now() }));
    let enqueueOk = false;
    try {
      const r = await postDispararPipeline(pipeline);
      enqueueOk = true;
      const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const tempoEstimado = TEMPO_ESTIMADO[pipeline] || 'alguns minutos';
      setFeedback(
        pipeline,
        'success',
        `Execução iniciada às ${horario} (estimativa: ${tempoEstimado}). Aguarde o spinner sair para rodar novamente.`,
        90_000,
      );
    } catch (err) {
      const data = err?.response?.data || {};
      // 409 jaEmExecucao: nao eh falha de fato — eh estado. Mantemos o botao
      // bloqueado e iniciamos polling igual, para refletir o job ja existente.
      if (err?.response?.status === 409 && data.jaEmExecucao) {
        enqueueOk = true;
        setFeedback(
          pipeline,
          'success',
          'Já existe uma execução em andamento. O botão libera quando ela terminar.',
          90_000,
        );
      } else {
        const mensagem = data.error || err.message;
        setFeedback(pipeline, 'error', `Falha ao enfileirar: ${mensagem}`, 30_000);
      }
    }

    if (!enqueueOk) {
      liberarAcao(pipeline);
      return;
    }

    // Espera o job sair da fila/active. Enquanto isso o botao fica disabled
    // com spinner.
    const fim = await aguardarJobTerminar(pipeline);
    // Pega a telemetria mais fresca direto da API para já refletir o ciclo
    // que acabou de terminar (carregar() seta state, mas o feedback abaixo
    // precisa do valor agora).
    let snapshot = null;
    try {
      const ps = await getAprendizadoPipelines();
      snapshot = (ps?.pipelines || []).find((p) => p.pipeline === pipeline) || null;
    } catch {
      // erros de rede não bloqueiam o feedback
    }
    // Atualiza o estado global em paralelo (sem await — o feedback usa o
    // snapshot local).
    carregar().catch(() => {});
    if (fim.ok) {
      const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const detalhe = snapshot?.ultimaExecucaoMensagem
        ? ` — ${snapshot.ultimaExecucaoMensagem}`
        : '';
      const tone = snapshot?.ultimaExecucaoOk === false ? 'error' : 'success';
      setFeedback(
        pipeline,
        tone,
        `Execução concluída às ${horario}${detalhe}.`,
        60_000,
      );
    } else {
      // Polling estourou timeout. O job pode ainda estar rodando — não
      // assumimos falha. Indicamos que o usuário acompanhe pelos KPIs.
      setFeedback(
        pipeline,
        'info',
        'O job ainda está em execução. O spinner foi liberado, mas o ciclo continua no servidor. Acompanhe os KPIs e a Última execução acima.',
        60_000,
      );
    }
    liberarAcao(pipeline);
  }, [carregar, liberarAcao, aguardarJobTerminar]);

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
    acaoIniciadaEm,
    feedbackPipeline,
    pausar, retomar, disparar,
    darFeedbackInsight, resolverInsight, descartarInsight,
    limparTodosInsights, descartarTodosInsights,
    resetarExtracoes,
    recarregar: carregar,
  };
}
