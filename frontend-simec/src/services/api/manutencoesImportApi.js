// Client da importação em lote de preventivas.
//
// Backend descarta o buffer dos arquivos após extrair — todo o trabalho de
// edição acontece no front em estado local, e o usuário confirma um array
// final de items via criarLote.

import api from '../http/apiClient';

export const extrairLotePreventivas = (files) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('arquivos', file);
  }
  return api
    .post('/manutencoes/importacao/extrair-lote', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const criarLotePreventivas = (items) =>
  api.post('/manutencoes/importacao/criar-lote', { items }).then((r) => r.data);
