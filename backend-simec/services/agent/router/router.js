import { AgendamentoService } from '../agendamento/agendamentoService.js';
import { RelatorioService } from '../relatorio/relatorioService.js';
import { SeguroService } from '../seguro/seguroService.js';
import { OsCorretivaAgentService } from '../osCorretiva/index.js';
import { classificarIntencao } from '../shared/intentClassifier.js';
import { resolverAcaoPorContexto } from '../shared/actionResolver.js';
import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { respostaAgente } from '../core/agentResponse.js';
import {
  logAgentError,
  logAgentStage,
} from '../core/agentLogger.js';
import { getSessionKey } from '../core/sessionKeys.js';
import { RESET_COMMANDS } from './resetCommands.js';
import {
  ajustarIntencaoPorHeuristica,
  pareceAgendamento,
  pareceConsultaRelatorio,
  pareceSeguro,
  pareceOsCorretiva,
} from './intentRouting.js';

async function cancelarSessaoSeExistir(sessao, mensagem) {
  if (!sessao) return;

  await AgentSessionRepository.cancelarSessao(sessao.id);

  await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem, {
    acao: 'TROCA_DE_INTENCAO',
  });
}

async function buscarSessoesAtivas(tenantId, sessionKey) {
  const [sessaoAgendamento, sessaoRelatorio, sessaoSeguro, sessaoOsCorretiva] = await Promise.all([
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'AGENDAR_MANUTENCAO'),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'RELATORIO'),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'SEGURO'),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'OS_CORRETIVA'),
  ]);

  return {
    sessaoAgendamento,
    sessaoRelatorio,
    sessaoSeguro,
    sessaoOsCorretiva,
    temAgendamentoAtivo: !!sessaoAgendamento,
    temRelatorioAtivo: !!sessaoRelatorio,
    temSeguroAtivo: !!sessaoSeguro,
    temOsCorretivaAtivo: !!sessaoOsCorretiva,
  };
}

function montarContextoUsuario(usuarioId, usuarioNome, tenantId, requestId) {
  return { usuarioId, usuarioNome, tenantId, requestId };
}

export const RoteadorAgente = async ({
  mensagem,
  usuarioId,
  usuarioNome,
  tenantId,
  requestId = null,
}) => {
  try {
    const msgMinuscula = mensagem.toLowerCase().trim();
    const sessionKey = getSessionKey(usuarioId, tenantId);
    const contextoUsuario = montarContextoUsuario(
      usuarioId,
      usuarioNome,
      tenantId,
      requestId
    );
    const logContext = {
      requestId,
      tenantId,
      usuarioId,
      usuarioNome,
    };

    await AgentSessionRepository.expirarSessoesAntigas(tenantId, sessionKey);

    const {
      sessaoAgendamento,
      sessaoRelatorio,
      sessaoSeguro,
      sessaoOsCorretiva,
      temAgendamentoAtivo,
      temRelatorioAtivo,
      temSeguroAtivo,
      temOsCorretivaAtivo,
    } = await buscarSessoesAtivas(tenantId, sessionKey);

    logAgentStage('AGENT_ROUTER_STATE', logContext, {
      sessionKey,
      mensagem,
      temAgendamentoAtivo,
      temRelatorioAtivo,
      temSeguroAtivo,
      temOsCorretivaAtivo,
      sessaoAgendamentoId: sessaoAgendamento?.id || null,
      sessaoRelatorioId: sessaoRelatorio?.id || null,
      sessaoSeguroId: sessaoSeguro?.id || null,
      sessaoOsCorretivaId: sessaoOsCorretiva?.id || null,
    });

    if (RESET_COMMANDS.some((cmd) => msgMinuscula.includes(cmd))) {
      await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
      await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
      await cancelarSessaoSeExistir(sessaoSeguro, mensagem);
      await cancelarSessaoSeExistir(sessaoOsCorretiva, mensagem);

      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'RESET',
        matchedCommand: RESET_COMMANDS.find((cmd) => msgMinuscula.includes(cmd)),
      });

      return respostaAgente('Certo, vamos começar de novo. Como posso ajudar?');
    }

    const acaoAgendamento = sessaoAgendamento
      ? resolverAcaoPorContexto(sessaoAgendamento, mensagem)
      : null;

    if (acaoAgendamento?.matched) {
      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'CONTEXTUAL_ACTION',
        targetIntent: 'AGENDAR_MANUTENCAO',
        sessionId: sessaoAgendamento.id,
        action: acaoAgendamento.action,
      });

      return await AgendamentoService.processar(
        mensagem,
        contextoUsuario,
        sessaoAgendamento,
        acaoAgendamento
      );
    }

    const acaoRelatorio = sessaoRelatorio
      ? resolverAcaoPorContexto(sessaoRelatorio, mensagem)
      : null;

    if (acaoRelatorio?.matched) {
      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'CONTEXTUAL_ACTION',
        targetIntent: 'RELATORIO',
        sessionId: sessaoRelatorio.id,
        action: acaoRelatorio.action,
      });

      return await RelatorioService.processar(
        mensagem,
        contextoUsuario,
        sessaoRelatorio,
        acaoRelatorio
      );
    }

    const acaoSeguro = sessaoSeguro
      ? resolverAcaoPorContexto(sessaoSeguro, mensagem)
      : null;

    if (acaoSeguro?.matched) {
      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'CONTEXTUAL_ACTION',
        targetIntent: 'SEGURO',
        sessionId: sessaoSeguro.id,
        action: acaoSeguro.action,
      });

      return await SeguroService.processar(
        mensagem,
        contextoUsuario,
        sessaoSeguro,
        acaoSeguro
      );
    }

    const acaoOsCorretiva = sessaoOsCorretiva
      ? resolverAcaoPorContexto(sessaoOsCorretiva, mensagem)
      : null;

    if (acaoOsCorretiva?.matched) {
      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'CONTEXTUAL_ACTION',
        targetIntent: 'OS_CORRETIVA',
        sessionId: sessaoOsCorretiva.id,
        action: acaoOsCorretiva.action,
      });

      return await OsCorretivaAgentService.processar(
        mensagem,
        contextoUsuario,
        sessaoOsCorretiva,
        acaoOsCorretiva
      );
    }

    if (
      temAgendamentoAtivo &&
      !pareceSeguro(msgMinuscula) &&
      !pareceConsultaRelatorio(msgMinuscula)
    ) {
      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'CONTINUE_ACTIVE_SESSION',
        targetIntent: 'AGENDAR_MANUTENCAO',
        sessionId: sessaoAgendamento?.id || null,
      });

      return await AgendamentoService.processar(
        mensagem,
        contextoUsuario,
        sessaoAgendamento,
        null
      );
    }

    if (
      temRelatorioAtivo &&
      !pareceAgendamento(msgMinuscula) &&
      !pareceSeguro(msgMinuscula)
    ) {
      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'CONTINUE_ACTIVE_SESSION',
        targetIntent: 'RELATORIO',
        sessionId: sessaoRelatorio?.id || null,
      });

      return await RelatorioService.processar(
        mensagem,
        contextoUsuario,
        sessaoRelatorio,
        null
      );
    }

    if (
      temSeguroAtivo &&
      !pareceAgendamento(msgMinuscula) &&
      !pareceConsultaRelatorio(msgMinuscula) &&
      !pareceOsCorretiva(msgMinuscula)
    ) {
      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'CONTINUE_ACTIVE_SESSION',
        targetIntent: 'SEGURO',
        sessionId: sessaoSeguro?.id || null,
      });

      return await SeguroService.processar(
        mensagem,
        contextoUsuario,
        sessaoSeguro,
        null
      );
    }

    if (temOsCorretivaAtivo && !pareceAgendamento(msgMinuscula) && !pareceSeguro(msgMinuscula)) {
      logAgentStage('AGENT_ROUTER_DECISION', logContext, {
        decision: 'CONTINUE_ACTIVE_SESSION',
        targetIntent: 'OS_CORRETIVA',
        sessionId: sessaoOsCorretiva?.id || null,
      });

      return await OsCorretivaAgentService.processar(
        mensagem,
        contextoUsuario,
        sessaoOsCorretiva,
        null
      );
    }

    let intencao = await classificarIntencao(mensagem);
    intencao = ajustarIntencaoPorHeuristica(intencao, msgMinuscula);

    logAgentStage('AGENT_ROUTER_DECISION', logContext, {
      decision: 'CLASSIFIED_INTENT',
      targetIntent: intencao,
    });

    if (intencao === 'AGENDAR_MANUTENCAO') {
      await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
      await cancelarSessaoSeExistir(sessaoSeguro, mensagem);

      logAgentStage('AGENT_ROUTER_ROUTE', logContext, {
        targetIntent: intencao,
        reusedSessionId: sessaoAgendamento?.id || null,
      });

      return await AgendamentoService.processar(
        mensagem,
        contextoUsuario,
        sessaoAgendamento || null,
        null
      );
    }

    if (intencao === 'RELATORIO') {
      await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
      await cancelarSessaoSeExistir(sessaoSeguro, mensagem);

      logAgentStage('AGENT_ROUTER_ROUTE', logContext, {
        targetIntent: intencao,
        reusedSessionId: sessaoRelatorio?.id || null,
      });

      return await RelatorioService.processar(
        mensagem,
        contextoUsuario,
        sessaoRelatorio || null,
        null
      );
    }

    if (intencao === 'SEGURO') {
      await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
      await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
      await cancelarSessaoSeExistir(sessaoOsCorretiva, mensagem);

      logAgentStage('AGENT_ROUTER_ROUTE', logContext, {
        targetIntent: intencao,
        reusedSessionId: sessaoSeguro?.id || null,
      });

      return await SeguroService.processar(
        mensagem,
        contextoUsuario,
        sessaoSeguro || null,
        null
      );
    }

    if (intencao === 'OS_CORRETIVA') {
      await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
      await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
      await cancelarSessaoSeExistir(sessaoSeguro, mensagem);

      logAgentStage('AGENT_ROUTER_ROUTE', logContext, {
        targetIntent: intencao,
        reusedSessionId: sessaoOsCorretiva?.id || null,
      });

      return await OsCorretivaAgentService.processar(
        mensagem,
        contextoUsuario,
        sessaoOsCorretiva || null,
        null
      );
    }

    logAgentStage('AGENT_ROUTER_ROUTE', logContext, {
      targetIntent: 'UNKNOWN',
      decision: 'FALLBACK_GREETING',
    });

    return respostaAgente(
      'Olá! Sou a T.H.I.A.G.O. Posso ajudar com agendamentos, relatórios, seguros e ocorrências corretivas. Como posso ajudar?'
    );
  } catch (error) {
    logAgentError(
      'AGENT_ROUTER_ERROR',
      error,
      {
        requestId,
        tenantId,
        usuarioId,
        usuarioNome,
      },
      {
        mensagem,
      }
    );

    return respostaAgente(
      'Tive um problema técnico ao processar sua mensagem. Poderia repetir?'
    );
  }
};
