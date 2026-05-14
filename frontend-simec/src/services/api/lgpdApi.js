// Cliente HTTP para os endpoints LGPD: documentos legais e aceites de termos.
// Documentos sao publicos (nao exigem token); aceites sao do usuario logado.

import api from '../http/apiClient';

export const getDocumentosVigentes = () =>
  api.get('/lgpd/documentos').then((r) => r.data);

export const getDocumentoVigente = (documento) =>
  api.get(`/lgpd/documentos/${documento}`).then((r) => r.data);

export const getPendenciasAceite = () =>
  api.get('/lgpd/aceites/pendencias').then((r) => r.data);

export const getHistoricoAceites = () =>
  api.get('/lgpd/aceites/historico').then((r) => r.data);

export const postAceite = ({ documento, versao }) =>
  api.post('/lgpd/aceites', { documento, versao }).then((r) => r.data);
