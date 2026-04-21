import { AgendamentoService } from '../agendamento/agendamentoService.js';
import { RelatorioService } from '../relatorio/relatorioService.js';
import { SeguroService } from '../seguro/seguroService.js';
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
} from './intentRouting.js';

async function cancelarSessaoSeExistir(sessao, mensagem) {
  if (!sessao) return;

  await AgentSessionRepository.cancelarSessao(sessao.id);

  await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem, {
    acao: 'TROCA_DE_INTENCAO',
  });
}

async function buscarSessoesAtivas(tenantId, sessionKey) {
  const [sessaoAgendamento, sessaoRelatorio, sessaoSeguro] = await Promise.all([
    AgentSessionRepository.buscarSessaoAtiva(
      tenantId,
      sessionKey,
      'AGENDAR_MANUTENCAO'
    ),
    AgentSessionRepository.buscarSessaoAtiva(
      tenantId,
      sessionKey,
      'RELATORIO'
    ),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'SEGURO'),
  ]);

  return {
    sessaoAgendamento,
    sessaoRelatorio,
    sessaoSeguro,
    temAgendamentoAtivo: !!sessaoAgendamento,
    temRelatorioAtivo: !!sessaoRelatorio,
    temSeguroAtivo: !!sessaoSeguro,
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
      temAgendamentoAtivo,
      temRelatorioAtivo,
      temSeguroAtivo,
    } = await buscarSessoesAtivas(tenantId, sessionKey);

    logAgentStage('AGENT_ROUTER_STATE', logContext, {
      sessionKey,
      mensagem,
      temAgendamentoAtivo,
      temRelatorioAtivo,
      temSeguroAtivo,
      sessaoAgendamentoId: sessaoAgendamento?.id || null,
      sessaoRelatorioId: sessaoRelatorio?.id || null,
      sessaoSeguroId: sessaoSeguro?.id || null,
    });

    if (RESET_COMMANDS.some((cmd) => msgMinuscula.includes(cmd))) {
      await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
      await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
      await cancelarSessaoSeExistir(sessaoSeguro, mensagem);

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
      !pareceConsultaRelatorio(msgMinuscula)
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

    logAgentStage('AGENT_ROUTER_ROUTE', logContext, {
      targetIntent: 'UNKNOWN',
      decision: 'FALLBACK_GREETING',
    });

    return respostaAgente(
      'Olá! Sou a T.H.I.A.G.O. Posso ajudar com agendamentos, relatórios e seguros. Como posso ajudar?'
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
