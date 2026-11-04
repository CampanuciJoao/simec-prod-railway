import api from '../http/apiClient';

// ─── Providers / metadata ────────────────────────────────────────────────────
export const getSolarProviders = () =>
  api.get('/solar/providers').then((r) => r.data);

// ─── Plantas ─────────────────────────────────────────────────────────────────
export const getSolarPlants = () =>
  api.get('/solar/plants').then((r) => r.data);

export const salvarSolarPlant = (payload) =>
  api.post('/solar/plants', payload).then((r) => r.data);

export const desativarSolarPlant = (plantId) =>
  api.delete(`/solar/plants/${plantId}`).then((r) => r.data);

export const getSolarPlantStatus = (plantId) =>
  api.get(`/solar/plants/${plantId}/status`).then((r) => r.data);

export const getSolarPlantHistorico = (plantId, { inicio, fim } = {}) =>
  api.get(`/solar/plants/${plantId}/historico`, { params: { inicio, fim } }).then((r) => r.data);

export const getSolarPlantQuedas = (plantId, { limite = 50 } = {}) =>
  api.get(`/solar/plants/${plantId}/quedas`, { params: { limite } }).then((r) => r.data);

// ─── Inverters ───────────────────────────────────────────────────────────────
export const adicionarInverter = (plantId, payload) =>
  api.post(`/solar/plants/${plantId}/inverters`, payload).then((r) => r.data);

export const editarInverter = (inverterId, payload) =>
  api.put(`/solar/inverters/${inverterId}`, payload).then((r) => r.data);

export const removerInverter = (inverterId) =>
  api.delete(`/solar/inverters/${inverterId}`).then((r) => r.data);

// ─── Baterias ────────────────────────────────────────────────────────────────
export const adicionarBateria = (plantId, payload) =>
  api.post(`/solar/plants/${plantId}/baterias`, payload).then((r) => r.data);

export const removerBateria = (bateriaId) =>
  api.delete(`/solar/baterias/${bateriaId}`).then((r) => r.data);

// ─── Validar credencial (teste sem salvar) ───────────────────────────────────
export const validarCredencialSolar = (payload) =>
  api.post('/solar/validar-credencial', payload).then((r) => r.data);

// ─── Sungrow OAuth ──────────────────────────────────────────────────────────
export const sungrowAuthorizeUrl = (inverterId) =>
  api.post(`/solar/inverters/${inverterId}/sungrow/authorize-url`).then((r) => r.data);

export const sungrowAuthStatus = (inverterId) =>
  api.get(`/solar/inverters/${inverterId}/sungrow/auth-status`).then((r) => r.data);
