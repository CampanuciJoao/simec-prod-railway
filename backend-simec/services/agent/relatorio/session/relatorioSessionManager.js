import { AgentSessionRepository } from '../../session/agentSessionRepository.js';
import { logAgentStage } from '../../core/agentLogger.js';
import { getSessionKey } from '../../core/sessionKeys.js';

export async function registrarSessaoRelatorio(
  contextoUsuario,
  mensagem,
  respostaTexto,
  payload,
  sessaoExistente = null
) {
  const {
    usuarioId,
    tenantId,
    usuarioNome = null,
    requestId = null,
  } = contextoUsuario;
  const sessionKey = getSessionKey(usuarioId, tenantId);
  const logContext = {
    requestId,
    tenantId,
    usuarioId,
    usuarioNome,
    intent: 'RELATORIO',
  };

  let sessao = sessaoExistente;

  if (!sessao) {
    sessao = await AgentSessionRepository.criarSessao({
      usuario: sessionKey,
      tenantId,
      intent: 'RELATORIO',
      step: 'FINALIZADO',
      state: payload,
    });

    logAgentStage('RELATORIO_SESSION', logContext, {
      action: 'CREATED',
      sessionId: sessao.id,
    });
  } else {
    await AgentSessionRepository.salvarSessao(sessao.id, {
      step: 'FINALIZADO',
      state: payload,
      resumo: respostaTexto,
    });

    logAgentStage('RELATORIO_SESSION', logContext, {
      action: 'UPDATED',
      sessionId: sessao.id,
    });
  }

  await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);
  await AgentSessionRepository.registrarMensagem(
    sessao.id,
    'agent',
    respostaTexto,
    payload
  );

  logAgentStage('RELATORIO_SESSION', logContext, {
    action: 'MESSAGES_REGISTERED',
    sessionId: sessao.id,
  });

  return sessao;
}
