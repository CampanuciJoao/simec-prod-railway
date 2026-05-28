// Endpoints de custo LLM — exclusivos do superadmin do Tenant System.
// Backend agrega LlmCallLog (tabela de cada chamada a OpenAI/Gemini com
// tokens, custo USD e duracao).

import api from '../http/apiClient';

export async function obterResumoLlm(params = {}) {
  const res = await api.get('/superadmin/llm-call-log/resumo', { params });
  return res?.data ?? null;
}

export async function listarPorTenantLlm(params = {}) {
  const res = await api.get('/superadmin/llm-call-log/por-tenant', { params });
  return res?.data?.items ?? [];
}

export async function listarPorFeatureLlm(params = {}) {
  const res = await api.get('/superadmin/llm-call-log/por-feature', { params });
  return res?.data?.items ?? [];
}

export async function obterSerieDiariaLlm(params = {}) {
  const res = await api.get('/superadmin/llm-call-log/serie-diaria', { params });
  return res?.data?.items ?? [];
}
