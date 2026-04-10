import api from '../http/apiClient';

export const getLogAuditoria = (params = {}) =>
  api.get('/auditoria', { params }).then((res) => res.data);

export const getFiltrosAuditoria = () =>
  api.get('/auditoria/filtros').then((res) => res.data);