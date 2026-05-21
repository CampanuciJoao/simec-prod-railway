// Endpoints de visao cross-tenant da IA — exclusivos do superadmin do
// Tenant System. Espelha estruturalmente o que cada tenant ve em
// /gehc/aprendizado, mas agrega por cliente.

import api from '../http/apiClient';

export const getVisaoGlobalAprendizado = () =>
  api.get('/superadmin/aprendizado/visao-global').then((r) => r.data);

export const getAprendizadoPorTenant = () =>
  api.get('/superadmin/aprendizado/por-tenant').then((r) => r.data);

export const getPipelinesGlobais = () =>
  api.get('/superadmin/aprendizado/pipelines-globais').then((r) => r.data);
