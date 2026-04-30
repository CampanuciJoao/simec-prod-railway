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
          const REFRESH_TIMEOUT_MS = 8_000;
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
