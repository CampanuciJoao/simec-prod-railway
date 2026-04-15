export function interpretarRespostaAgente(response) {
  if (!response) {
    return {
      mensagem: 'Não recebi resposta válida.',
      acao: null,
      contexto: null,
      meta: null,
    };
  }

  return {
    mensagem: response.mensagem || '',
    acao: response.acao || null,
    contexto: response.contexto || null,
    meta: response.meta || null,
  };
}