function normalizeCepPayload(payload) {
  if (!payload || payload.erro) {
    return null;
  }

  return {
    cep: payload.cep || '',
    logradouro: payload.logradouro || '',
    bairro: payload.bairro || '',
    cidade: payload.localidade || '',
    estado: payload.uf || '',
  };
}

export async function buscarEnderecoPorCep(cep, { signal } = {}) {
  const digits = String(cep || '').replace(/\D/g, '');

  if (digits.length !== 8) {
    throw new Error('CEP inválido.');
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error('Não foi possível consultar o CEP.');
  }

  const payload = await response.json();
  const normalized = normalizeCepPayload(payload);

  if (!normalized) {
    throw new Error('CEP não encontrado.');
  }

  return normalized;
}
