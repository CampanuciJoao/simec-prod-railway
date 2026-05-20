import api from '../http/apiClient';

export const enviarMensagemAoAgente = async ({
  mensagem,
  historico = [],
  contextoExtra = null,
}) => {
  try {
    const payload = {
      mensagem,
      historico,
      contexto: contextoExtra,
    };

    const res = await api.post('/agent/chat', payload);

    if (!res?.data) {
      throw new Error('Resposta vazia do agente.');
    }

    const data = res.data;

    if (typeof data === 'string') {
      return normalizarResposta({
        mensagem: data,
      });
    }

    if (data?.resposta) {
      return normalizarResposta(data.resposta);
    }

    return normalizarResposta({
      mensagem: 'Recebi a resposta, mas em formato inesperado.',
    });
  } catch (error) {
    console.error('[AGENT_API_ERROR]', error);
    const classificado = classificarErroAgente(error);

    return normalizarResposta({
      mensagem: classificado.mensagem,
      meta: { reason: classificado.reason },
    });
  }
};

export const resetarSessaoDoAgente = async () => {
  try {
    const res = await api.post('/agent/reset');
    return normalizarResposta(res?.data?.resposta || {});
  } catch (error) {
    console.error('[AGENT_RESET_ERROR]', error);
    const classificado = classificarErroAgente(error, { contexto: 'reset' });

    return normalizarResposta({
      mensagem: classificado.mensagem,
      meta: { reason: classificado.reason },
    });
  }
};

function normalizarResposta(resposta = {}) {
  return {
    mensagem: resposta.mensagem || '',
    acao: resposta.acao || null,
    contexto: resposta.contexto || null,
    meta: resposta.meta || null,
  };
}

export const mapearHistoricoParaAPI = (messages = []) => {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
};

// Classifica o erro do agente em mensagens úteis para o usuário em pt-BR.
// Mantém o catch sem propagar exceção (consumidores só leem .mensagem),
// mas anexa meta.reason para telemetria e tratamento condicional na UI.
function classificarErroAgente(error, { contexto = 'chat' } = {}) {
  // Sem response: timeout, rede, abort
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
      return {
        reason: 'TIMEOUT',
        mensagem:
          'O agente está demorando demais para responder. Tente de novo em alguns instantes.',
      };
    }
    if (error?.code === 'ERR_NETWORK') {
      return {
        reason: 'NETWORK',
        mensagem:
          'Não consegui me conectar ao servidor. Verifique sua conexão e tente novamente.',
      };
    }
    return {
      reason: 'UNKNOWN_NO_RESPONSE',
      mensagem:
        contexto === 'reset'
          ? 'Não consegui reiniciar a conversa agora. Tente novamente.'
          : 'Tive um problema ao falar com o servidor. Tente novamente.',
    };
  }

  const status = error.response.status;
  const dataMsg = error.response.data?.message;

  // 401: sessão expirou. apiClient tenta refresh; se chegou aqui, falhou.
  if (status === 401) {
    return {
      reason: 'UNAUTHORIZED',
      mensagem:
        'Sua sessão expirou. Recarregue a página e faça login novamente.',
    };
  }

  if (status === 403) {
    return {
      reason: 'FORBIDDEN',
      mensagem: dataMsg || 'Você não tem permissão para usar o agente.',
    };
  }

  if (status === 429) {
    return {
      reason: 'RATE_LIMITED',
      mensagem:
        'Muitas mensagens em sequência. Aguarde alguns segundos e tente novamente.',
    };
  }

  if (status === 400 || status === 422) {
    return {
      reason: 'VALIDATION',
      mensagem:
        dataMsg ||
        'Não consegui entender sua mensagem. Tente reformular de outra forma.',
    };
  }

  if (status === 404) {
    return {
      reason: 'NOT_FOUND',
      mensagem:
        dataMsg ||
        'O agente não está disponível agora. Tente novamente em alguns minutos.',
    };
  }

  if (status >= 500 && status <= 599) {
    return {
      reason: `SERVER_${status}`,
      mensagem:
        'O agente está com problemas técnicos. Tente novamente em alguns instantes.',
    };
  }

  return {
    reason: `HTTP_${status}`,
    mensagem:
      dataMsg || 'Tive um problema ao processar sua solicitação. Tente novamente.',
  };
}
