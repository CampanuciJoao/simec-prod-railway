import {
  enviarMensagemAoAgente,
  mapearHistoricoParaAPI,
} from '@/services/api/agentApi';

export async function sendMessageToAgent({
  mensagem,
  messages = [],
  contexto = null,
}) {
  const historico = mapearHistoricoParaAPI(messages);

  return enviarMensagemAoAgente({
    mensagem,
    historico,
    contextoExtra: contexto,
  });
}

export { mapearHistoricoParaAPI };