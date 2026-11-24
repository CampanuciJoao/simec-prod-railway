/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getLembretes,
  getBadgeLembretes,
} from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const LembretesContext = createContext(null);

// Polling rodeia o sino. 60s mantem-se proximo do cron do backend (1min)
// sem gastar CPU/rede inutilmente.
const POLLING_INTERVAL_MS = 60_000;

export function LembretesProvider({ children }) {
  const [lembretes, setLembretes] = useState([]);
  const [badge, setBadge] = useState({ naoLidos: 0, atrasados: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const auth = useAuth?.();
  const isAuthenticated = auth?.isAuthenticated || false;
  const usuario = auth?.usuario || auth?.user || null;

  const pollingRef = useRef(null);

  const recarregar = useCallback(async () => {
    if (!isAuthenticated || !usuario?.id) {
      setLembretes([]);
      setBadge({ naoLidos: 0, atrasados: 0, total: 0 });
      return;
    }

    try {
      setLoading(true);
      const [b, items] = await Promise.all([
        getBadgeLembretes().catch(() => ({ naoLidos: 0, atrasados: 0, total: 0 })),
        getLembretes({ escopo: 'meus', status: 'ABERTOS', limite: 50 }).catch(() => []),
      ]);
      setBadge(b);
      setLembretes(Array.isArray(items) ? items : []);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, usuario?.id]);

  useEffect(() => {
    recarregar();

    if (pollingRef.current) clearInterval(pollingRef.current);
    if (isAuthenticated) {
      pollingRef.current = setInterval(recarregar, POLLING_INTERVAL_MS);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [recarregar, isAuthenticated]);

  const value = useMemo(
    () => ({ lembretes, badge, loading, recarregar }),
    [lembretes, badge, loading, recarregar]
  );

  return (
    <LembretesContext.Provider value={value}>
      {children}
    </LembretesContext.Provider>
  );
}

export function useLembretes() {
  const ctx = useContext(LembretesContext);
  if (!ctx) {
    throw new Error('useLembretes precisa estar dentro de LembretesProvider');
  }
  return ctx;
}
