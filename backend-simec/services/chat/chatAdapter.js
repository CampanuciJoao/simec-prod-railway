import { enviarMensagemAoAgente, mapearHistoricoParaAPI } from '@/services/api/agentApi';

export async function sendMessageToAgent({ mensagem, messages }) {
  const historico = mapearHistoricoParaAPI(messages);

  const response = await enviarMensagemAoAgente({
    mensagem,
    historico,
  });

  return response;
}