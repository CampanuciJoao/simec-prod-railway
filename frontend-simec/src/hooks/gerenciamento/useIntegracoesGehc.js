import { useCallback, useEffect, useState } from 'react';
import {
  getGehcStatus,
  postGehcDiscovery,
  postGehcMonitor,
  postGehcSync,
  putVincularEquipamento,
  deleteDesvincularEquipamento,
} from '@/services/api/gehcApi';

export function useIntegracoesGehc() {
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [runningSync, setRunningSync]           = useState(false);
  const [runningMonitor, setRunningMonitor]     = useState(false);

  const [resultDiscovery, setResultDiscovery] = useState(null);
  const [resultSync, setResultSync]           = useState(null);
  const [resultMonitor, setResultMonitor]     = useState(null);

  // Vinculação manual: { equipamentoId → { running, error } }
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

  const vincularEquipamento = useCallback(async (equipamentoId, gehcAssetId) => {
    setVincularState(s => ({ ...s, [equipamentoId]: { running: true, error: null } }));
    try {
      await putVincularEquipamento(equipamentoId, gehcAssetId);
      await carregarStatus();
      setVincularState(s => ({ ...s, [equipamentoId]: { running: false, error: null } }));
    } catch (err) {
      setVincularState(s => ({
        ...s,
        [equipamentoId]: { running: false, error: err?.response?.data?.error ?? err.message },
      }));
    }
  }, [carregarStatus]);

  const desvincularEquipamento = useCallback(async (equipamentoId) => {
    setVincularState(s => ({ ...s, [equipamentoId]: { running: true, error: null } }));
    try {
      await deleteDesvincularEquipamento(equipamentoId);
      await carregarStatus();
      setVincularState(s => ({ ...s, [equipamentoId]: { running: false, error: null } }));
    } catch (err) {
      setVincularState(s => ({
        ...s,
        [equipamentoId]: { running: false, error: err?.response?.data?.error ?? err.message },
      }));
    }
  }, [carregarStatus]);

  return {
    status,
    loading,
    error,
    carregarStatus,
    rodarDiscovery,
    runningDiscovery,
    resultDiscovery,
    rodarSync,
    runningSync,
    resultSync,
    rodarMonitor,
    runningMonitor,
    resultMonitor,
    vincularEquipamento,
    desvincularEquipamento,
    vincularState,
  };
}
