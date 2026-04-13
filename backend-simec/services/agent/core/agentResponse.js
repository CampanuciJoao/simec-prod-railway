export function respostaAgente(mensagem, extras = {}) {
  return {
    mensagem,
    acao: extras.acao || null,
    contexto: extras.contexto || null,
    meta: extras.meta || null,
  };
}