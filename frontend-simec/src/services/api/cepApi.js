function normalizeViaCep(payload) {
  if (!payload || payload.erro) return null;
  return {
    cep: payload.cep || '',
    logradouro: payload.logradouro || '',
    bairro: payload.bairro || '',
    cidade: payload.localidade || '',
    estado: payload.uf || '',
  };
}

function normalizeBrasilApi(payload) {
  if (!payload || payload.message) return null;
  return {
    cep: payload.cep || '',
    logradouro: payload.street || '',
    bairro: payload.neighborhood || '',
    cidade: payload.city || '',
    estado: payload.state || '',
  };
}

export async function buscarEnderecoPorCep(cep, { signal } = {}) {
  const digits = String(cep || '').replace(/\D/g, '');

  if (digits.length !== 8) {
    throw new Error('CEP inválido.');
  }

  const viaCepRes = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    method: 'GET',
    signal,
  });

  if (viaCepRes.ok) {
    const payload = await viaCepRes.json();
    const normalized = normalizeViaCep(payload);
    if (normalized) return normalized;
  }

  const brasilApiRes = await fetch(
    `https://brasilapi.com.br/api/cep/v2/${digits}`,
    { method: 'GET', signal }
  );

  if (!brasilApiRes.ok) {
    throw new Error('CEP não encontrado.');
  }

  const payload = await brasilApiRes.json();
  const normalized = normalizeBrasilApi(payload);

  if (!normalized) {
    throw new Error('CEP não encontrado.');
  }

  return normalized;
}
