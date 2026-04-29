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

export function AlertasProvider({ children }) {
  const [alertas, setAlertas] = useState([]);
  const [naoVistos, setNaoVistos] = useState(0);
  const [loading, setLoading] = useState(true);

  const auth = useAuth?.();
  const usuario = auth?.usuario || auth?.user || null;
  const isAuthenticated = auth?.isAuthenticated || false;
  const authLoading = auth?.loading || false;

  const pollingRef = useRef(null);

  const carregarAlertas = useCallback(async () => {
    if (!isAuthenticated || authLoading || !usuario?.id) {
      setAlertas([]);
      setNaoVistos(0);
      if (!authLoading) {
        setLoading(false);
      }
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

  useEffect(() => {
    if (!isAuthenticated || authLoading || !usuario?.id) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (!authLoading) {
        setAlertas([]);
        setNaoVistos(0);
        setLoading(false);
      }

      return undefined;
    }

    carregarAlertas();

    pollingRef.current = setInterval(() => {
      carregarAlertas();
    }, 30000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

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
      alertaAnterior =
        prevAlertas.find((alerta) => alerta.id === alertaId) || null;

      return prevAlertas.map((alerta) =>
        alerta.id === alertaId ? { ...alerta, status: newStatus } : alerta
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
      alertaAnterior =
        prevAlertas.find((alerta) => alerta.id === alertaId) || null;
      return prevAlertas.filter((alerta) => alerta.id !== alertaId);
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
