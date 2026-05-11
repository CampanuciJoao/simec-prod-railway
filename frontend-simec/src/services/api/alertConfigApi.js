import api from '../http/apiClient';

/**
 * Lista módulos suportados pelo centro de configuração de alertas.
 * Retorna { modulos: [{ module, schema, defaults }] }.
 */
export const getAlertConfigModules = () =>
  api.get('/alert-config/modules').then((res) => res.data);

/**
 * Carrega a configuração efetiva de um módulo para o tenant atual.
 * Retorna { module, defaults, config, meta }
 *   - meta: { updatedAt, updatedBy } ou null se ainda usa só defaults.
 */
export const getAlertConfig = (module) =>
  api.get(`/alert-config/${module}`).then((res) => res.data);

/**
 * Atualiza parcialmente a configuração (apenas admin).
 * payload: { config: { chave: valor, ... } }
 */
export const putAlertConfig = (module, partial) =>
  api.put(`/alert-config/${module}`, { config: partial }).then((res) => res.data);

/**
 * Restaura defaults (apenas admin).
 */
export const resetAlertConfig = (module) =>
  api.post(`/alert-config/${module}/reset`).then((res) => res.data);
