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

// ─── Falhas (Fase 1) ────────────────────────────────────────────────────────
export const getSolarFalhas = (plantId, { status = 'ativas', limite = 50 } = {}) =>
  api.get(`/solar/plants/${plantId}/falhas`, { params: { status, limite } }).then((r) => r.data);

// ─── Agregados mensais (Fase 3) ─────────────────────────────────────────────
export const getSolarAgregadoMesAtual = (plantId) =>
  api.get(`/solar/plants/${plantId}/agregado-mes-atual`).then((r) => r.data);

export const getSolarAgregadosMensais = (plantId, { limite = 12 } = {}) =>
  api.get(`/solar/plants/${plantId}/agregados-mensais`, { params: { limite } }).then((r) => r.data);

export const getSolarAgregadosDiarios = (plantId, { ano, mes } = {}) =>
  api.get(`/solar/plants/${plantId}/agregados-diarios`, { params: { ano, mes } }).then((r) => r.data);

// ─── Relatorios PDF solar (Fase 4) ──────────────────────────────────────────
// Download via axios (precisa Authorization). Browser salva como attachment.
async function baixarPdfBlob(path, params, fallbackFilename) {
  const response = await api.get(path, { params, responseType: 'blob' });
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackFilename;
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const baixarSolarRelatorioPdf = (plantId, { ano, mes } = {}) =>
  baixarPdfBlob(
    `/solar/plants/${plantId}/relatorio-pdf`,
    { ano, mes },
    `simec-solar-${ano}-${String(mes).padStart(2, '0')}.pdf`,
  );

export const baixarSolarProducaoPdf = (plantId, { dataInicio, dataFim } = {}) =>
  baixarPdfBlob(
    `/solar/plants/${plantId}/relatorio-producao-pdf`,
    { dataInicio, dataFim },
    `simec-solar-producao-${dataInicio}-${dataFim}.pdf`,
  );

export const baixarSolarFalhasPdf = (plantId, { dataInicio, dataFim, inverterId } = {}) =>
  baixarPdfBlob(
    `/solar/plants/${plantId}/relatorio-falhas-pdf`,
    { dataInicio, dataFim, inverterId },
    `simec-solar-falhas-${dataInicio}-${dataFim}.pdf`,
  );
