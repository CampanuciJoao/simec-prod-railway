/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { loginUsuario, logoutUsuario, refreshSessao } from '@/services/api';
import {
  iniciarImpersonacao as apiIniciarImpersonacao,
  encerrarImpersonacao as apiEncerrarImpersonacao,
} from '@/services/api/impersonacaoApi';
import { setDefaultTimezone } from '@/utils/timeUtils';

export const AuthContext = createContext(null);

function parseJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(normalized));
  } catch {
    return null;
  }
}

function hydrateStoredData(parsed) {
  const tenant = parsed?.tenant || null;
  const impersonacao = parsed?.impersonacao || null;
  const usuario = parsed?.usuario
    ? {
        ...parsed.usuario,
        tenant,
      }
    : null;

  return {
    ...parsed,
    tenant,
    usuario,
    impersonacao,
  };
}

function clearStorage() {
  localStorage.removeItem('userInfo');
}

function setStorage(data) {
  localStorage.setItem('userInfo', JSON.stringify(data));
}

function getStoredUserInfo() {
  try {
    const userInfoString = localStorage.getItem('userInfo');

    if (!userInfoString) return null;

    const parsed = JSON.parse(userInfoString);

    if (!parsed?.usuario || !parsed?.token) {
      clearStorage();
      return null;
    }

    return hydrateStoredData(parsed);
  } catch (error) {
    console.error(
      '[AUTH_CONTEXT_STORAGE_ERROR] Falha ao carregar userInfo do localStorage.',
      error
    );
    clearStorage();
    return null;
  }
}

function isTokenExpired(token) {
  const jwtPayload = parseJwtPayload(token);
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return Boolean(jwtPayload?.exp && jwtPayload.exp <= nowInSeconds);
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [impersonacao, setImpersonacao] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const syncAuthState = useCallback((data) => {
    const hydrated = hydrateStoredData(data);
    setStorage(hydrated);
    setUsuario(hydrated.usuario);
    setTenant(hydrated.tenant || null);
    setImpersonacao(hydrated.impersonacao || null);
    // Hierarquia: usuario -> tenant -> UTC
    setDefaultTimezone(hydrated.usuario?.timezone || hydrated.tenant?.timezone);
    return hydrated;
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrapAuth() {
      const storedData = getStoredUserInfo();

      if (!storedData?.usuario || !storedData?.token) {
        if (active) setLoading(false);
        return;
      }

      if (!isTokenExpired(storedData.token)) {
        if (active) {
          setUsuario(storedData.usuario);
          setTenant(storedData.tenant || null);
          setImpersonacao(storedData.impersonacao || null);
          // Hierarquia: usuario -> tenant -> UTC
          setDefaultTimezone(storedData.usuario?.timezone || storedData.tenant?.timezone);
          setLoading(false);
        }
        return;
      }

      try {
        const refreshed = await refreshSessao();
        const hydrated = hydrateStoredData(refreshed);

        if (active) {
          setStorage(hydrated);
          setUsuario(hydrated.usuario);
          setTenant(hydrated.tenant || null);
          setImpersonacao(hydrated.impersonacao || null);
          // Hierarquia: usuario -> tenant -> UTC
          setDefaultTimezone(hydrated.usuario?.timezone || hydrated.tenant?.timezone);
        }
      } catch (error) {
        console.error('[AUTH_CONTEXT_REFRESH_BOOTSTRAP_ERROR]', error);
        clearStorage();
        if (active) {
          setUsuario(null);
          setTenant(null);
          setImpersonacao(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrapAuth();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (username, senha, tenantSlug, redirectPath = null) => {
      try {
        // tenantSlug é opcional. Sem slug, backend tenta autenticar como
        // superadmin do Tenant System. Com slug, fluxo de cliente normal.
        const responseData = await loginUsuario({
          username,
          senha,
          tenant: tenantSlug || undefined,
        });

        const hydrated = syncAuthState(responseData);
        // Superadmin do Tenant System vai pro plano de controle por default.
        const destino =
          redirectPath ||
          (hydrated.tenant?.kind === 'SYSTEM' ? '/superadmin' : '/dashboard');
        navigate(destino, { replace: true });
      } catch (error) {
        console.error('[AUTH_CONTEXT_LOGIN_ERROR]', error);
        throw error;
      }
    },
    [navigate, syncAuthState]
  );

  // Abre sessão de impersonação. Backend devolve token novo (com claims) e
  // dados do tenant alvo. Persistimos em userInfo e atualizamos contexto.
  const iniciarImpersonacao = useCallback(
    async ({ tenantId, motivo }) => {
      const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const data = await apiIniciarImpersonacao({ tenantId, motivo });
      if (!data?.token || !data?.impersonacao) {
        throw new Error('Resposta inválida do servidor para impersonação.');
      }
      const next = {
        ...stored,
        token: data.token,
        impersonacao: data.impersonacao,
      };
      syncAuthState(next);
      // Após impersonar, leva pro dashboard normal do tenant alvo.
      navigate('/dashboard', { replace: true });
      return data.impersonacao;
    },
    [navigate, syncAuthState]
  );

  // Encerra a sessão de impersonação. Backend devolve token limpo (sem claims).
  const encerrarImpersonacao = useCallback(async () => {
    try {
      const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const data = await apiEncerrarImpersonacao();
      const next = {
        ...stored,
        token: data?.token || stored.token,
        impersonacao: null,
      };
      syncAuthState(next);
      navigate('/superadmin', { replace: true });
    } catch (error) {
      console.error('[AUTH_CONTEXT_ENCERRAR_IMPERSONACAO_ERROR]', error);
      throw error;
    }
  }, [navigate, syncAuthState]);

  const logout = useCallback(async () => {
    try {
      await logoutUsuario();
    } catch (error) {
      console.error('[AUTH_CONTEXT_LOGOUT_ERROR]', error);
    } finally {
      clearStorage();
      setUsuario(null);
      setTenant(null);
      setImpersonacao(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const isAdmin = useMemo(() => {
    if (usuario?.role) return ['admin', 'superadmin'].includes(usuario.role);
    try {
      const stored = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const payload = parseJwtPayload(stored?.token || '');
      return ['admin', 'superadmin'].includes(payload?.role);
    } catch {
      return false;
    }
  }, [usuario]);

  const isSuperAdminSystem = useMemo(
    () => usuario?.role === 'superadmin' && tenant?.kind === 'SYSTEM',
    [usuario, tenant]
  );

  const value = useMemo(
    () => ({
      usuario,
      user: usuario,
      tenant,
      impersonacao,
      isAuthenticated: !!usuario,
      isAdmin,
      isSuperAdminSystem,
      loading,
      login,
      logout,
      iniciarImpersonacao,
      encerrarImpersonacao,
      syncAuthState,
    }),
    [
      usuario,
      tenant,
      impersonacao,
      isAdmin,
      isSuperAdminSystem,
      loading,
      login,
      logout,
      iniciarImpersonacao,
      encerrarImpersonacao,
      syncAuthState,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}