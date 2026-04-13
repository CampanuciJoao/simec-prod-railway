import { AgentSessionRepository } from '../../session/agentSessionRepository.js';
import { getSessionKey } from '../../core/sessionKeys.js';

export async function registrarSessaoRelatorio(
  contextoUsuario,
  mensagem,
  respostaTexto,
  payload,
  sessaoExistente = null
) {
  const { usuarioId, tenantId } = contextoUsuario;
  const sessionKey = getSessionKey(usuarioId, tenantId);

  let sessao = sessaoExistente;

  if (!sessao) {
    sessao = await AgentSessionRepository.criarSessao({
      usuario: sessionKey,
      tenantId,
      intent: 'RELATORIO',
      step: 'FINALIZADO',
      state: payload,
    });
  } else {
    await AgentSessionRepository.salvarSessao(sessao.id, {
      step: 'FINALIZADO',
      state: payload,
      resumo: respostaTexto,
    });
  }

  await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);
  await AgentSessionRepository.registrarMensagem(
    sessao.id,
    'agent',
    respostaTexto,
    payload
  );

  return sessao;
}