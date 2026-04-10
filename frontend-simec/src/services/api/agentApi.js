import api from '../http/apiClient';

export const enviarMensagemAoAgente = async (mensagem) => {
  try {
    const res = await api.post('/agent/chat', { mensagem });

    if (!res?.data) {
      throw new Error('Resposta vazia do agente.');
    }

    if (typeof res.data === 'string') {
      return {
        resposta: {
          mensagem: res.data,
          acao: null,
          contexto: null,
          meta: null,
        },
      };
    }

    if (res.data?.resposta) {
      return res.data;
    }

    return {
      resposta: {
        mensagem: 'Recebi a resposta, mas em formato inesperado.',
        acao: null,
        contexto: null,
        meta: null,
      },
    };
  } catch (error) {
    console.error('[API_CHAT_ERROR]', error);

    return {
      resposta: {
        mensagem: 'Tive um problema ao processar sua solicitação.',
        acao: null,
        contexto: null,
        meta: null,
      },
    };
  }
};