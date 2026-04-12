import api from '../http/apiClient';

/**
 * Envia mensagem para o agente inteligente do SIMEC
 * Suporta histórico para contexto (chat contínuo)
 */
export const enviarMensagemAoAgente = async ({
  mensagem,
  historico = [],
  contextoExtra = null,
}) => {
  try {
    const payload = {
      mensagem,
      historico, // 👈 importante para IA aprender contexto
      contexto: contextoExtra, // 👈 futuro uso (BI, filtros, etc)
    };

    const res = await api.post('/agent/chat', payload);

    if (!res?.data) {
      throw new Error('Resposta vazia do agente.');
    }

    const data = res.data;

    // ✅ Caso API retorne string direta
    if (typeof data === 'string') {
      return normalizarResposta({
        mensagem: data,
      });
    }

    // ✅ Caso API já esteja no padrão correto
    if (data?.resposta) {
      return normalizarResposta(data.resposta);
    }

    // ✅ fallback
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

/**
 * Normaliza qualquer resposta da API para padrão único
 */
function normalizarResposta(resposta = {}) {
  return {
    mensagem: resposta.mensagem || '',
    acao: resposta.acao || null,
    contexto: resposta.contexto || null,
    meta: resposta.meta || null,
  };
}

/**
 * (OPCIONAL) Função helper para montar histórico no formato esperado
 */
export const mapearHistoricoParaAPI = (messages = []) => {
  return messages.map((msg) => ({
    role: msg.role, // 'user' | 'assistant'
    content: msg.content,
  }));
};