import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const userString = localStorage.getItem('userInfo');

    if (userString) {
      try {
        const token = JSON.parse(userString)?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error(
          'Interceptor de Requisição: Erro ao processar dados do localStorage.',
          error
        );
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.endsWith('/auth/login')
    ) {
      console.warn(
        'Interceptor de Resposta: Erro 401 (token expirado/inválido). Deslogando...'
      );

      localStorage.removeItem('userInfo');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;