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
import { io } from 'socket.io-client';

import { getAlertas, updateStatusAlerta } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const AlertasContext = createContext(null);

function getSocketUrl() {
  return import.meta.env.VITE_API_URL?.split('/api')[0] || 'http://localhost:5000';
}

export function AlertasProvider({ children }) {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  const auth = useAuth?.();
  const usuario = auth?.usuario || auth?.user || null;
  const isAuthenticated = auth?.isAuthenticated || false;
  const authLoading = auth?.loading || false;

  const socketRef = useRef(null);

  const carregarAlertas = useCallback(async () => {
    if (!isAuthenticated || authLoading || !usuario?.id) {
      setAlertas([]);
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    try {
      const data = await getAlertas();
      setAlertas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[ALERTAS_CONTEXT_FETCH_ERROR]', error);
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, usuario?.id]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || !usuario?.id) {
      if (!authLoading) {
        setAlertas([]);
        setLoading(false);
      }
      return undefined;
    }

    carregarAlertas();

    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect_error', (error) => {
      console.error('[ALERTAS_CONTEXT_SOCKET_CONNECT_ERROR]', error);
    });

    socket.on('atualizar-alertas', () => {
      carregarAlertas();
    });

    return () => {
      socket.off('atualizar-alertas');
      socket.disconnect();
      socketRef.current = null;
      setAlertas([]);
      setLoading(true);
    };
  }, [isAuthenticated, authLoading, usuario?.id, carregarAlertas]);

  const updateStatus = useCallback(async (alertaId, newStatus) => {
    let snapshot = [];

    setAlertas((prevAlertas) => {
      snapshot = prevAlertas;

      return prevAlertas.map((alerta) =>
        alerta.id === alertaId ? { ...alerta, status: newStatus } : alerta
      );
    });

    try {
      await updateStatusAlerta(alertaId, newStatus);
    } catch (error) {
      console.error('[ALERTAS_CONTEXT_UPDATE_STATUS_ERROR]', error);
      setAlertas(snapshot);
    }
  }, []);

  const dismissAlerta = useCallback(async (alertaId) => {
    let snapshot = [];

    setAlertas((prevAlertas) => {
      snapshot = prevAlertas;
      return prevAlertas.filter((alerta) => alerta.id !== alertaId);
    });

    try {
      await updateStatusAlerta(alertaId, 'Visto');
    } catch (error) {
      console.error('[ALERTAS_CONTEXT_DISMISS_ERROR]', error);
      setAlertas(snapshot);
    }
  }, []);

  const value = useMemo(
    () => ({
      alertas,
      loading,
      updateStatus,
      dismissAlerta,
      refetchAlertas: carregarAlertas,
    }),
    [alertas, loading, updateStatus, dismissAlerta, carregarAlertas]
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
