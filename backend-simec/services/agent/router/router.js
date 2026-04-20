import { AgendamentoService } from '../agendamento/agendamentoService.js';
import { RelatorioService } from '../relatorio/relatorioService.js';
import { SeguroService } from '../seguro/seguroService.js';
import { classificarIntencao } from '../shared/intentClassifier.js';
import { resolverAcaoPorContexto } from '../shared/actionResolver.js';
import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { respostaAgente } from '../core/agentResponse.js';
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

function montarContextoUsuario(usuarioId, usuarioNome, tenantId) {
  return { usuarioId, usuarioNome, tenantId };
}

export const RoteadorAgente = async ({
  mensagem,
  usuarioId,
  usuarioNome,
  tenantId,
}) => {
  try {
    const msgMinuscula = mensagem.toLowerCase().trim();
    const sessionKey = getSessionKey(usuarioId, tenantId);
    const contextoUsuario = montarContextoUsuario(
      usuarioId,
      usuarioNome,
      tenantId
    );

    await AgentSessionRepository.expirarSessoesAntigas(tenantId, sessionKey);

    const {
      sessaoAgendamento,
      sessaoRelatorio,
      sessaoSeguro,
      temAgendamentoAtivo,
      temRelatorioAtivo,
      temSeguroAtivo,
    } = await buscarSessoesAtivas(tenantId, sessionKey);

    if (RESET_COMMANDS.some((cmd) => msgMinuscula.includes(cmd))) {
      await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
      await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
      await cancelarSessaoSeExistir(sessaoSeguro, mensagem);

      return respostaAgente('Certo, vamos começar de novo. Como posso ajudar?');
    }

    const acaoAgendamento = sessaoAgendamento
      ? resolverAcaoPorContexto(sessaoAgendamento, mensagem)
      : null;

    if (acaoAgendamento?.matched) {
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
      return await SeguroService.processar(
        mensagem,
        contextoUsuario,
        sessaoSeguro,
        null
      );
    }

    let intencao = await classificarIntencao(mensagem);
    intencao = ajustarIntencaoPorHeuristica(intencao, msgMinuscula);

    console.log(
      `[AGENT_ROUTER] Tenant: ${tenantId} | User: ${usuarioNome} | Intenção: ${intencao}`
    );

    if (intencao === 'AGENDAR_MANUTENCAO') {
      await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
      await cancelarSessaoSeExistir(sessaoSeguro, mensagem);

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

      return await SeguroService.processar(
        mensagem,
        contextoUsuario,
        sessaoSeguro || null,
        null
      );
    }

    return respostaAgente(
      'Olá! Sou a T.H.I.A.G.O. Posso ajudar com agendamentos, relatórios e seguros. Como posso ajudar?'
    );
  } catch (error) {
    console.error('[AGENT_ROUTER_ERROR]', error);

    return respostaAgente(
      'Tive um problema técnico ao processar sua mensagem. Poderia repetir?'
    );
  }
};
