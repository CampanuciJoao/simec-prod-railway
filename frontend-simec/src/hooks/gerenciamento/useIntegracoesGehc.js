import { useCallback, useEffect, useState } from 'react';
import {
  getGehcStatus,
  postGehcDiscovery,
  postGehcMonitor,
  postGehcSync,
  putVincularEquipamento,
  deleteDesvincularEquipamento,
  postGehcCredenciais,
  deleteGehcCredenciais,
  postGehcOnboard,
} from '@/services/api/gehcApi';

export function useIntegracoesGehc() {
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [runningSync, setRunningSync]           = useState(false);
  const [runningMonitor, setRunningMonitor]     = useState(false);
  const [runningCredenciais, setRunningCredenciais] = useState(false);
  const [runningOnboard, setRunningOnboard]     = useState(false);

  const [resultDiscovery, setResultDiscovery]     = useState(null);
  const [resultSync, setResultSync]               = useState(null);
  const [resultMonitor, setResultMonitor]         = useState(null);
  const [resultCredenciais, setResultCredenciais] = useState(null);
  const [resultOnboard, setResultOnboard]         = useState(null);

  const [vincularState, setVincularState] = useState({});

  const carregarStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGehcStatus();
      setStatus(data);
    } catch (err) {
      setError(err?.response?.data?.error ?? err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarStatus(); }, [carregarStatus]);

  const salvarCredenciais = useCallback(async (login, password) => {
    setRunningCredenciais(true);
    setResultCredenciais(null);
    try {
      const res = await postGehcCredenciais(login, password);
      setResultCredenciais({ ok: true, ...res });
      await carregarStatus();
    } catch (err) {
      setResultCredenciais({ ok: false, error: err?.response?.data?.error ?? err.message });
    } finally {
      setRunningCredenciais(false);
    }
  }, [carregarStatus]);

  const excluirCredenciais = useCallback(async () => {
    setRunningCredenciais(true);
    setResultCredenciais(null);
    try {
      await deleteGehcCredenciais();
      setResultCredenciais({ ok: true, mensagem: 'Credenciais removidas.' });
      await carregarStatus();
    } catch (err) {
      setResultCredenciais({ ok: false, error: err?.response?.data?.error ?? err.message });
    } finally {
      setRunningCredenciais(false);
    }
  }, [carregarStatus]);

  const rodarDiscovery = useCallback(async () => {
    setRunningDiscovery(true);
    setResultDiscovery(null);
    try {
      const res = await postGehcDiscovery();
      setResultDiscovery({ ok: true, ...res });
      await carregarStatus();
    } catch (err) {
      setResultDiscovery({ ok: false, error: err?.response?.data?.error ?? err.message });
    } finally {
      setRunningDiscovery(false);
    }
  }, [carregarStatus]);

  const rodarSync = useCallback(async () => {
    setRunningSync(true);
    setResultSync(null);
    try {
      const res = await postGehcSync();
      setResultSync({ ok: true, ...res });
      await carregarStatus();
    } catch (err) {
      setResultSync({ ok: false, error: err?.response?.data?.error ?? err.message });
    } finally {
      setRunningSync(false);
    }
  }, [carregarStatus]);

  // Onboarding em uma chamada (ADR-016): salvar credenciais + autenticar +
  // discovery + primeira captura. Backend retorna objeto `passos` com status
  // de cada etapa para o frontend exibir progresso.
  const rodarOnboard = useCallback(async (login, password) => {
    setRunningOnboard(true);
    setResultOnboard(null);
    try {
      const res = await postGehcOnboard(login, password);
      setResultOnboard({ ok: true, ...res });
      await carregarStatus();
      return { ok: true, ...res };
    } catch (err) {
      const payload = err?.response?.data;
      const fail = {
        ok: false,
        error: payload?.error ?? err.message,
        passos: payload?.passos ?? null,
        falhouEm: payload?.falhouEm ?? null,
      };
      setResultOnboard(fail);
      // Re-carrega status mesmo em falha: alguns passos podem ter completado
      // (ex.: credenciais salvas mas auth falhou). UI precisa refletir isso.
      await carregarStatus().catch(() => {});
      return fail;
    } finally {
      setRunningOnboard(false);
    }
  }, [carregarStatus]);

  const rodarMonitor = useCallback(async () => {
    setRunningMonitor(true);
    setResultMonitor(null);
    try {
      const res = await postGehcMonitor();
      setResultMonitor({ ok: true, ...res });
      await carregarStatus();
    } catch (err) {
      setResultMonitor({ ok: false, error: err?.response?.data?.error ?? err.message });
    } finally {
      setRunningMonitor(false);
    }
  }, [carregarStatus]);

  const removerPendenteConfirmacao = useCallback((equipamentoId) => {
    setResultDiscovery(prev => {
      if (!prev?.detalhes?.pendentesConfirmacao) return prev;
      return {
        ...prev,
        detalhes: {
          ...prev.detalhes,
          pendentesConfirmacao: prev.detalhes.pendentesConfirmacao.filter(e => e.simecId !== equipamentoId),
        },
      };
    });
  }, []);

  const vincularEquipamento = useCallback(async (equipamentoId, gehcAssetId) => {
    setVincularState(s => ({ ...s, [equipamentoId]: { running: true, error: null } }));
    try {
      await putVincularEquipamento(equipamentoId, gehcAssetId);
      removerPendenteConfirmacao(equipamentoId);
      await carregarStatus();
      setVincularState(s => ({ ...s, [equipamentoId]: { running: false, error: null } }));
    } catch (err) {
      setVincularState(s => ({
        ...s,
        [equipamentoId]: { running: false, error: err?.response?.data?.error ?? err.message },
      }));
    }
  }, [carregarStatus, removerPendenteConfirmacao]);

  const desvincularEquipamento = useCallback(async (equipamentoId) => {
    setVincularState(s => ({ ...s, [equipamentoId]: { running: true, error: null } }));
    try {
      await deleteDesvincularEquipamento(equipamentoId);
      removerPendenteConfirmacao(equipamentoId);
      await carregarStatus();
      setVincularState(s => ({ ...s, [equipamentoId]: { running: false, error: null } }));
    } catch (err) {
      setVincularState(s => ({
        ...s,
        [equipamentoId]: { running: false, error: err?.response?.data?.error ?? err.message },
      }));
    }
  }, [carregarStatus, removerPendenteConfirmacao]);

  return {
    status,
    loading,
    error,
    carregarStatus,
    salvarCredenciais,
    excluirCredenciais,
    runningCredenciais,
    resultCredenciais,
    rodarDiscovery,
    runningDiscovery,
    resultDiscovery,
    rodarSync,
    runningSync,
    resultSync,
    rodarMonitor,
    runningMonitor,
    resultMonitor,
    rodarOnboard,
    runningOnboard,
    resultOnboard,
    vincularEquipamento,
    desvincularEquipamento,
    vincularState,
  };
}
