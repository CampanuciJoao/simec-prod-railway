// Ficheiro: src/services/api.js
// VERSÃO FINAL CORRIGIDA - COM A FUNÇÃO 'updateUsuario'

import axios from 'axios';

// 1. CONFIGURAÇÃO CENTRAL DA INSTÂNCIA DO AXIOS
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 2. INTERCEPTOR DE REQUISIÇÃO: Adiciona o token JWT
api.interceptors.request.use(
  (config) => {
    const userString = localStorage.getItem('userInfo'); 
    if (userString) {
      try {
        const token = JSON.parse(userString)?.token;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Interceptor de Requisição: Erro ao processar dados do localStorage.', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. INTERCEPTOR DE RESPOSTA: Trata erros de autenticação (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.endsWith('/auth/login')) {
      console.warn('Interceptor de Resposta: Erro 401 (token expirado/inválido). Deslogando...');
      localStorage.removeItem('userInfo');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================================================
// --- SERVIÇOS DA API (ORGANIZADOS POR RECURSO) ---
// ==========================================================================

// --- Autenticação ---
export const loginUsuario = (credenciais) => api.post('/auth/login', credenciais).then(res => res.data);
export const registrarUsuario = (dadosUsuario) => api.post('/auth/register', dadosUsuario).then(res => res.data);

// --- Usuários (Admin) ---
export const getUsuarios = () => api.get('/users').then(res => res.data);
export const criarUsuario = (dadosUsuario) => api.post('/users', dadosUsuario).then(res => res.data);
// >> CORREÇÃO APLICADA AQUI <<
export const updateUsuario = (id, dadosUsuario) => api.put(`/users/${id}`, dadosUsuario).then(res => res.data);
export const deletarUsuario = (id) => api.delete(`/users/${id}`).then(res => res.data);

// --- Dashboard ---
export const getDashboardData = () => api.get('/dashboard-data').then(res => res.data);

// --- Equipamentos ---
export const getEquipamentos = (filtros = {}) => api.get('/equipamentos', { params: filtros }).then(res => res.data);
export const getEquipamentoById = (id) => api.get(`/equipamentos/${id}`).then(res => res.data);
export const addEquipamento = (equipamentoData) => api.post('/equipamentos', equipamentoData).then(res => res.data);
export const updateEquipamento = (id, equipamentoData) => api.put(`/equipamentos/${id}`, equipamentoData).then(res => res.data);
export const deleteEquipamento = (id) => api.delete(`/equipamentos/${id}`).then(res => res.data);

// --- Anexos de Equipamento ---
export const uploadAnexoEquipamento = (equipamentoId, formData) => api.post(`/equipamentos/${equipamentoId}/anexos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
export const deleteAnexoEquipamento = (equipamentoId, anexoId) => api.delete(`/equipamentos/${equipamentoId}/anexos/${anexoId}`).then(res => res.data);

// --- Acessórios ---
export const getAcessoriosPorEquipamento = (equipamentoId) => api.get(`/equipamentos/${equipamentoId}/acessorios`).then(res => res.data);
export const addAcessorio = (equipamentoId, acessorioData) => api.post(`/equipamentos/${equipamentoId}/acessorios`, acessorioData).then(res => res.data);
export const updateAcessorio = (equipamentoId, acessorioId, acessorioData) => api.put(`/equipamentos/${equipamentoId}/acessorios/${acessorioId}`, acessorioData).then(res => res.data);
export const deleteAcessorio = (equipamentoId, acessorioId) => api.delete(`/equipamentos/${equipamentoId}/acessorios/${acessorioId}`).then(res => res.data);

// --- Manutenções ---
export const getManutencoes = (params = {}) => api.get('/manutencoes', { params }).then(res => res.data);
export const getManutencaoById = (id) => api.get(`/manutencoes/${id}`).then(res => res.data);
export const addManutencao = (manutencaoData) => api.post('/manutencoes', manutencaoData).then(res => res.data);
export const updateManutencao = (id, manutencaoData) => api.put(`/manutencoes/${id}`, manutencaoData).then(res => res.data);
export const deleteManutencao = (id) => api.delete(`/manutencoes/${id}`).then(res => res.data);
export const concluirManutencao = (id, data) => api.post(`/manutencoes/${id}/concluir`, data).then(res => res.data);
export const cancelarManutencao = (id, data) => api.post(`/manutencoes/${id}/cancelar`, data).then(res => res.data);
export const uploadAnexoManutencao = (manutencaoId, formData) => api.post(`/manutencoes/${manutencaoId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
export const deleteAnexoManutencao = (manutencaoId, anexoId) => api.delete(`/manutencoes/${manutencaoId}/anexos/${anexoId}`).then(res => res.data);
export const addNotaAndamento = (manutencaoId, notaData) => api.post(`/manutencoes/${manutencaoId}/notas`, notaData).then(res => res.data);

// --- Alertas ---
export const getAlertas = () => api.get('/alertas').then(res => res.data);
export const updateAlertaStatus = (alertaId, status) => api.put(`/alertas/${alertaId}/status`, { status }).then(res => res.data);

// --- Contratos ---
export const getContratos = () => api.get('/contratos').then(res => res.data);
export const getContratoById = (id) => api.get(`/contratos/${id}`).then(res => res.data);
export const addContrato = (contratoData) => api.post('/contratos', contratoData).then(res => res.data);
export const updateContrato = (id, contratoData) => api.put(`/contratos/${id}`, contratoData).then(res => res.data);
export const deleteContrato = (id) => api.delete(`/contratos/${id}`).then(res => res.data);
export const uploadAnexoContrato = (contratoId, formData) => api.post(`/contratos/${contratoId}/anexos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
export const deleteAnexoContrato = (contratoId, anexoId) => api.delete(`/contratos/${contratoId}/anexos/${anexoId}`).then(res => res.data);

// --- Seguros ---
export const getSeguros = () => api.get('/seguros').then(res => res.data);
export const getSeguroById = (id) => api.get(`/seguros/${id}`).then(res => res.data);
export const addSeguro = (seguroData) => api.post('/seguros', seguroData).then(res => res.data);
export const updateSeguro = (id, seguroData) => api.put(`/seguros/${id}`, seguroData).then(res => res.data);
export const deleteSeguro = (id) => api.delete(`/seguros/${id}`).then(res => res.data);
export const uploadAnexoSeguro = (seguroId, formData) => api.post(`/seguros/${seguroId}/anexos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
export const deleteAnexoSeguro = (seguroId, anexoId) => api.delete(`/seguros/${seguroId}/anexos/${anexoId}`).then(res => res.data);

// --- Relatórios ---
export const gerarRelatorio = (filtros) => api.post('/relatorios/gerar', filtros).then(res => res.data);

// --- Auditoria ---
export const getLogAuditoria = (params = {}) => api.get('/auditoria', { params }).then(res => res.data);
export const getFiltrosAuditoria = () => api.get('/auditoria/filtros').then(res => res.data);

// --- Unidades ---
export const getUnidades = () => api.get('/unidades').then(res => res.data);
export const getUnidadeById = (id) => api.get(`/unidades/${id}`).then(res => res.data);
export const addUnidade = (unidadeData) => api.post('/unidades', unidadeData).then(res => res.data);
export const updateUnidade = (id, unidadeData) => api.put(`/unidades/${id}`, unidadeData).then(res => res.data);
export const deleteUnidade = (id) => api.delete(`/unidades/${id}`).then(res => res.data);

// --- E-mails de Notificação (Admin) ---
export const getEmailsNotificacao = () => api.get('/emails-notificacao').then(res => res.data);
export const addEmailNotificacao = (dadosEmail) => api.post('/emails-notificacao', dadosEmail).then(res => res.data);
export const updateEmailNotificacao = (id, dadosEmail) => api.put(`/emails-notificacao/${id}`, dadosEmail).then(res => res.data);
export const deleteEmailNotificacao = (id) => api.delete(`/emails-notificacao/${id}`).then(res => res.data);

// --- Ocorrências (Ficha Técnica) ---
export const getOcorrenciasPorEquipamento = (id) => api.get(`/ocorrencias/equipamento/${id}`).then(res => res.data);
export const addOcorrencia = (dados) => api.post('/ocorrencias', dados).then(res => res.data);
export const resolverOcorrencia = (id, dados) => api.put(`/ocorrencias/${id}/resolver`, dados).then(res => res.data);

export default api;