import api from '../http/apiClient';

export const getTenantSettings = () =>
  api.get('/tenant/settings').then((res) => res.data);

export const updateTenantSettings = (payload) =>
  api.put('/tenant/settings', payload).then((res) => res.data);

// Upload do logo do tenant. file: File (PNG/JPG) do input.
export const uploadTenantLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api
    .post('/tenant/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

export const removerTenantLogo = () =>
  api.delete('/tenant/logo').then((res) => res.data);

// Baixa o logo como Blob (usa apiClient pra incluir Authorization header).
// Retorna null se 404 (tenant sem logo). Outros erros propagam.
export const fetchTenantLogoBlob = async () => {
  try {
    const res = await api.get('/tenant/logo', { responseType: 'blob' });
    return res.data; // Blob
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};
