import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { loginUsuario } from '@/services/api';

export const AuthContext = createContext(null);

function getStoredUserInfo() {
  try {
    const userInfoString = localStorage.getItem('userInfo');

    if (!userInfoString) return null;

    const parsed = JSON.parse(userInfoString);

    if (parsed?.usuario && parsed?.token) {
      return parsed;
    }

    localStorage.removeItem('userInfo');
    return null;
  } catch (error) {
    console.error(
      '[AUTH_CONTEXT_STORAGE_ERROR] Falha ao carregar userInfo do localStorage.',
      error
    );
    localStorage.removeItem('userInfo');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const storedData = getStoredUserInfo();

    if (storedData?.usuario) {
      setUsuario(storedData.usuario);
    }

    setLoading(false);
  }, []);

  const login = useCallback(
    async (username, senha) => {
      try {
        const credenciais = { username, senha };
        const responseData = await loginUsuario(credenciais);

        localStorage.setItem('userInfo', JSON.stringify(responseData));
        setUsuario(responseData.usuario);

        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('[AUTH_CONTEXT_LOGIN_ERROR]', error);
        throw error;
      }
    },
    [navigate]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('userInfo');
    setUsuario(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      usuario,
      user: usuario, // compatibilidade temporária
      isAuthenticated: !!usuario,
      loading,
      login,
      logout,
    }),
    [usuario, loading, login, logout]
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