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

export const AuthContext = createContext(null);

function parseJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[AUTH_CONTEXT_JWT_PARSE_ERROR]', error);
    return null;
  }
}

function hydrateStoredData(parsed) {
  const tenant = parsed?.tenant || null;
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
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const syncAuthState = useCallback((data) => {
    const hydrated = hydrateStoredData(data);
    setStorage(hydrated);
    setUsuario(hydrated.usuario);
    setTenant(hydrated.tenant || null);
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
        }
      } catch (error) {
        console.error('[AUTH_CONTEXT_REFRESH_BOOTSTRAP_ERROR]', error);
        clearStorage();
        if (active) {
          setUsuario(null);
          setTenant(null);
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
    async (username, senha, tenantSlug, redirectPath = '/dashboard') => {
      try {
        const responseData = await loginUsuario({
          username,
          senha,
          tenant: tenantSlug,
        });

        syncAuthState(responseData);
        navigate(redirectPath, { replace: true });
      } catch (error) {
        console.error('[AUTH_CONTEXT_LOGIN_ERROR]', error);
        throw error;
      }
    },
    [navigate, syncAuthState]
  );

  const logout = useCallback(async () => {
    try {
      await logoutUsuario();
    } catch (error) {
      console.error('[AUTH_CONTEXT_LOGOUT_ERROR]', error);
    } finally {
      clearStorage();
      setUsuario(null);
      setTenant(null);
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

  const value = useMemo(
    () => ({
      usuario,
      user: usuario,
      tenant,
      isAuthenticated: !!usuario,
      isAdmin,
      loading,
      login,
      logout,
      syncAuthState,
    }),
    [usuario, tenant, isAdmin, loading, login, logout, syncAuthState]
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
