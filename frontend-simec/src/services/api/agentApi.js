import api from '../http/apiClient';

/**
 * Envia mensagem para o agente inteligente do SIMEC
 * Suporta histórico para contexto
 */
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

    return normalizarResposta({
      mensagem:
        '⚠️ Tive um problema ao processar sua solicitação.\n\nTente novamente.',
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