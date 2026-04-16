function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toSafeString(value, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value == null) return fallback;

  return String(value);
}

function extractMensagem(payload) {
  if (!payload) return '';

  if (typeof payload === 'string') {
    return toSafeString(payload);
  }

  if (isObject(payload?.resposta)) {
    return toSafeString(payload.resposta.mensagem);
  }

  if (isObject(payload?.data?.resposta)) {
    return toSafeString(payload.data.resposta.mensagem);
  }

  if (isObject(payload) && 'mensagem' in payload) {
    return toSafeString(payload.mensagem);
  }

  if (isObject(payload?.data) && 'mensagem' in payload.data) {
    return toSafeString(payload.data.mensagem);
  }

  return '';
}

function extractAcao(payload) {
  if (!payload) return null;

  if (isObject(payload?.resposta) && 'acao' in payload.resposta) {
    return payload.resposta.acao ?? null;
  }

  if (isObject(payload?.data?.resposta) && 'acao' in payload.data.resposta) {
    return payload.data.resposta.acao ?? null;
  }

  if (isObject(payload) && 'acao' in payload) {
    return payload.acao ?? null;
  }

  if (isObject(payload?.data) && 'acao' in payload.data) {
    return payload.data.acao ?? null;
  }

  return null;
}

function extractContexto(payload) {
  if (!payload) return null;

  if (isObject(payload?.resposta) && 'contexto' in payload.resposta) {
    return payload.resposta.contexto ?? null;
  }

  if (isObject(payload?.data?.resposta) && 'contexto' in payload.data.resposta) {
    return payload.data.resposta.contexto ?? null;
  }

  if (isObject(payload) && 'contexto' in payload) {
    return payload.contexto ?? null;
  }

  if (isObject(payload?.data) && 'contexto' in payload.data) {
    return payload.data.contexto ?? null;
  }

  return null;
}

function extractMeta(payload) {
  if (!payload) return null;

  if (isObject(payload?.resposta) && 'meta' in payload.resposta) {
    return payload.resposta.meta ?? null;
  }

  if (isObject(payload?.data?.resposta) && 'meta' in payload.data.resposta) {
    return payload.data.resposta.meta ?? null;
  }

  if (isObject(payload) && 'meta' in payload) {
    return payload.meta ?? null;
  }

  if (isObject(payload?.data) && 'meta' in payload.data) {
    return payload.data.meta ?? null;
  }

  return null;
}

export function interpretarRespostaAgente(payload) {
  const mensagem =
    extractMensagem(payload) ||
    'Recebi a resposta, mas em formato inesperado.';

  return {
    mensagem,
    acao: extractAcao(payload),
    contexto: extractContexto(payload),
    meta: extractMeta(payload),
  };
}

export function obterMensagemAssistente(payload) {
  return interpretarRespostaAgente(payload).mensagem;
}

export default interpretarRespostaAgente;