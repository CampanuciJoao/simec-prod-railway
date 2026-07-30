import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let refreshPromise = null;

function getStoredUserInfo() {
  const userString = localStorage.getItem('userInfo');
  if (!userString) return null;

  try {
    return JSON.parse(userString);
  } catch (error) {
    console.error('Falha ao processar userInfo do localStorage.', error);
    localStorage.removeItem('userInfo');
    return null;
  }
}

function setStoredUserInfo(payload) {
  localStorage.setItem('userInfo', JSON.stringify(payload));
}

function clearStoredUserInfo() {
  localStorage.removeItem('userInfo');
}

api.interceptors.request.use(
  (config) => {
    const userInfo = getStoredUserInfo();
    const token = userInfo?.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Erro do refresh que indica indisponibilidade transitoria (backend
// down, deploy, timeout de rede). Nao desloga o usuario — apenas
// devolve o erro pra request original tratar. Deslogar aqui seria
// falso-positivo em quase todos os casos.
function ehErroTransitorioNoRefresh(err) {
  if (err?.message === 'Refresh token timeout') return true;
  const status = err?.response?.status;
  if (status === 502 || status === 503 || status === 504) return true;
  // Sem response = network error (offline, DNS, TLS handshake fail).
  if (!err?.response && err?.code) return true;
  return false;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest?.url?.includes('/auth/');

    if (
      error.response?.status === 401 &&
      !isAuthRoute &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          // Timeout generoso: cold start do Railway + DB pool aquecendo
          // podem levar 15-25s. Antes 8s causava falso-logout constante.
          const REFRESH_TIMEOUT_MS = 30_000;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Refresh token timeout')),
              REFRESH_TIMEOUT_MS
            )
          );
          refreshPromise = Promise.race([
            refreshClient.post('/auth/refresh'),
            timeoutPromise,
          ]);
        }
        const refreshResponse = await refreshPromise;
        refreshPromise = null;

        const current = getStoredUserInfo();
        const nextUserInfo = {
          ...(current || {}),
          ...refreshResponse.data,
        };
        setStoredUserInfo(nextUserInfo);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextUserInfo.token}`;

        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;

        // Erro transitorio (backend indisponivel, timeout de rede) NAO
        // e' sinal de sessao invalida. Devolve o erro pra request
        // original — usuario pode retentar sem ter que relogar.
        if (ehErroTransitorioNoRefresh(refreshError)) {
          return Promise.reject(refreshError);
        }

        // 401 explicito no refresh (sessao expirada ou revogada) —
        // agora sim: limpa storage e redireciona pra login.
        clearStoredUserInfo();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
