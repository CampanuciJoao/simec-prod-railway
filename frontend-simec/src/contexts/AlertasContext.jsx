/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import {
  getAlertas,
  getResumoAlertas,
  updateStatusAlerta,
} from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const AlertasContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Polling de 120s serve apenas como rede de segurança — o SSE garante atualizações instantâneas.
const POLLING_INTERVAL_MS = 120_000;

function getStoredToken() {
  try {
    const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return info?.token || null;
  } catch {
    return null;
  }
}

export function AlertasProvider({ children }) {
  const [alertas, setAlertas]     = useState([]);
  const [naoVistos, setNaoVistos] = useState(0);
  const [loading, setLoading]     = useState(true);

  const auth          = useAuth?.();
  const usuario       = auth?.usuario || auth?.user || null;
  const isAuthenticated = auth?.isAuthenticated || false;
  const authLoading   = auth?.loading || false;

  const pollingRef = useRef(null);
  const esRef      = useRef(null);

  const carregarAlertas = useCallback(async () => {
    if (!isAuthenticated || authLoading || !usuario?.id) {
      setAlertas([]);
      setNaoVistos(0);
      if (!authLoading) setLoading(false);
      return;
    }

    try {
      const [resumo, recentes] = await Promise.all([
        getResumoAlertas(),
        getAlertas({ pageSize: 8 }),
      ]);

      setNaoVistos(Number(resumo?.naoVistos || 0));
      setAlertas(Array.isArray(recentes?.data) ? recentes.data : []);
    } catch (error) {
      console.error('[ALERTAS_CONTEXT_FETCH_ERROR]', error);
      setAlertas([]);
      setNaoVistos(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, usuario?.id]);

  // SSE — recebe contagem em tempo real emitida pelo backend após cada ciclo de alertas
  useEffect(() => {
    if (!isAuthenticated || authLoading || !usuario?.id) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    const token = getStoredToken();
    if (!token) return;

    const url = `${API_BASE_URL}/alertas/stream?t=${encodeURIComponent(token)}`;
    const es  = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'alertas_count') {
          setNaoVistos(Number(msg.naoVistos || 0));
          carregarAlertas();
        }
      } catch {
        // payload inválido — ignorar
      }
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isAuthenticated, authLoading, usuario?.id, carregarAlertas]);

  // Polling de segurança — garante sincronização mesmo se SSE cair
  useEffect(() => {
    if (!isAuthenticated || authLoading || !usuario?.id) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;

      if (!authLoading) {
        setAlertas([]);
        setNaoVistos(0);
        setLoading(false);
      }

      return undefined;
    }

    carregarAlertas();

    pollingRef.current = setInterval(carregarAlertas, POLLING_INTERVAL_MS);

    return () => {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      setAlertas([]);
      setNaoVistos(0);
      setLoading(true);
    };
  }, [isAuthenticated, authLoading, usuario?.id, carregarAlertas]);

  const updateStatus = useCallback(async (alertaId, newStatus) => {
    let snapshot = [];
    let alertaAnterior = null;

    setAlertas((prevAlertas) => {
      snapshot = prevAlertas;
      alertaAnterior = prevAlertas.find((a) => a.id === alertaId) || null;
      return prevAlertas.map((a) =>
        a.id === alertaId ? { ...a, status: newStatus } : a
      );
    });

    if (alertaAnterior?.status === 'NaoVisto' && newStatus === 'Visto') {
      setNaoVistos((prev) => Math.max(0, prev - 1));
    }
    if (alertaAnterior?.status === 'Visto' && newStatus === 'NaoVisto') {
      setNaoVistos((prev) => prev + 1);
    }

    try {
      await updateStatusAlerta(alertaId, newStatus);
    } catch (error) {
      console.error('[ALERTAS_CONTEXT_UPDATE_STATUS_ERROR]', error);
      setAlertas(snapshot);
      await carregarAlertas();
    }
  }, [carregarAlertas]);

  const dismissAlerta = useCallback(async (alertaId) => {
    let snapshot = [];
    let alertaAnterior = null;

    setAlertas((prevAlertas) => {
      snapshot = prevAlertas;
      alertaAnterior = prevAlertas.find((a) => a.id === alertaId) || null;
      return prevAlertas.filter((a) => a.id !== alertaId);
    });

    if (alertaAnterior?.status === 'NaoVisto') {
      setNaoVistos((prev) => Math.max(0, prev - 1));
    }

    try {
      await updateStatusAlerta(alertaId, 'Visto');
    } catch (error) {
      console.error('[ALERTAS_CONTEXT_DISMISS_ERROR]', error);
      setAlertas(snapshot);
      await carregarAlertas();
    }
  }, [carregarAlertas]);

  const value = useMemo(
    () => ({
      alertas,
      naoVistos,
      loading,
      updateStatus,
      dismissAlerta,
      refetchAlertas: carregarAlertas,
    }),
    [alertas, naoVistos, loading, updateStatus, dismissAlerta, carregarAlertas]
  );

  return (
    <AlertasContext.Provider value={value}>
      {children}
    </AlertasContext.Provider>
  );
}

export function useAlertas() {
  const context = useContext(AlertasContext);

  if (!context) {
    throw new Error('useAlertas deve ser usado dentro de um AlertasProvider');
  }

  return context;
}
