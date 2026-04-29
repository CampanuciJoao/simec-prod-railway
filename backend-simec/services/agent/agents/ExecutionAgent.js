import { AgendamentoService } from '../agendamento/agendamentoService.js';
import { RelatorioService } from '../relatorio/relatorioService.js';
import { SeguroService } from '../seguro/seguroService.js';
import { AnalyticsService } from '../analytics/analyticsService.js';
import { BatchAgendamentoService } from '../batch/batchAgendamentoService.js';
import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { respostaAgente } from '../core/agentResponse.js';
import { adicionarAuditoria } from '../orchestrator/AgentContext.js';

const SERVICOS = {
  AGENDAMENTO: AgendamentoService,
  RELATORIO: RelatorioService,
  SEGURO: SeguroService,
  ANALYTICS: AnalyticsService,
  BATCH_AGENDAMENTO: BatchAgendamentoService,
};

async function cancelarSessao(sessao, mensagem) {
  if (!sessao) return;
  await AgentSessionRepository.cancelarSessao(sessao.id);
  await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem, {
    acao: 'TROCA_DE_INTENCAO',
  });
}

async function prePopularSessaoAgendamento(contexto, tenantId) {
  const { interpretacao, sessionKey } = contexto;
  if (!interpretacao?.entidades) return null;

  const { equipamento, unidade, setor, urgencia } = interpretacao.entidades;

  let equipamentoTexto = null;
  if (equipamento && setor) {
    equipamentoTexto = `${equipamento} ${setor}`;
  } else if (equipamento) {
    equipamentoTexto = equipamento;
  }

  const stateInicial = {
    unidadeTexto: unidade || null,
    equipamentoTexto,
    tipoManutencao: urgencia === 'Alta' ? 'Corretiva' : null,
  };

  const temAlgo = Object.values(stateInicial).some((v) => v !== null);
  if (!temAlgo) return null;

  console.log('[EXECUTION_AGENT] Pré-populando sessão de agendamento:', stateInicial);

  return AgentSessionRepository.criarSessao({
    usuario: sessionKey,
    tenantId,
    intent: 'AGENDAR_MANUTENCAO',
    step: 'START',
    state: stateInicial,
  });
}

export const ExecutionAgent = {
  nome: 'ExecutionAgent',
  capacidades: ['executar_agendamento', 'executar_relatorio', 'executar_seguro', 'executar_analytics', 'executar_reset'],

  async executar(contexto) {
    const { mensagem, usuarioId, usuarioNome, tenantId, plano, validacao } = contexto;

    if (!validacao?.aprovado) {
      const resposta = respostaAgente(
        validacao?.bloqueios?.[0] || 'Não foi possível processar sua solicitação.'
      );
      contexto.resposta = resposta;
      adicionarAuditoria(contexto, { agente: 'ExecutionAgent', acao: 'BLOQUEADO_POR_VALIDACAO' });
      return resposta;
    }

    const contextoUsuario = { usuarioId, usuarioNome, tenantId };

    if (plano.acao === 'RESET') {
      for (const sessao of plano.cancelar_sessoes) {
        await cancelarSessao(sessao, mensagem);
      }
      const resposta = respostaAgente('Certo, vamos começar de novo. Como posso ajudar?');
      contexto.resposta = resposta;
      adicionarAuditoria(contexto, { agente: 'ExecutionAgent', acao: 'RESET_EXECUTADO' });
      return resposta;
    }

    if (plano.acao === 'RESPONDER_SAUDACAO') {
      const resposta = respostaAgente(
        'Olá! Sou a T.H.I.A.G.O. Posso ajudar com agendamentos, relatórios, seguros e análises. Como posso ajudar?'
      );
      contexto.resposta = resposta;
      adicionarAuditoria(contexto, { agente: 'ExecutionAgent', acao: 'SAUDACAO' });
      return resposta;
    }

    for (const sessao of plano.cancelar_sessoes) {
      await cancelarSessao(sessao, mensagem);
    }

    // Pré-popular sessão de agendamento com entidades extraídas
    if (plano.acao === 'NOVA_SESSAO' && plano.dominio === 'AGENDAMENTO') {
      const sessaoPrePopulada = await prePopularSessaoAgendamento(contexto, tenantId);
      if (sessaoPrePopulada) {
        plano.sessao_alvo = sessaoPrePopulada;
        const camposPrePopulados = Object.entries(
          JSON.parse(sessaoPrePopulada.stateJson)
        )
          .filter(([, v]) => v !== null)
          .map(([k]) => k);
        adicionarAuditoria(contexto, {
          agente: 'ExecutionAgent',
          acao: 'SESSION_PRE_POPULADA',
          campos: camposPrePopulados,
        });
      }
    }

    const servico = SERVICOS[plano.dominio];
    if (!servico) {
      const resposta = respostaAgente('Não encontrei um serviço para processar sua solicitação.');
      contexto.resposta = resposta;
      adicionarAuditoria(contexto, {
        agente: 'ExecutionAgent',
        acao: 'SERVICO_NAO_ENCONTRADO',
        dominio: plano.dominio,
      });
      return resposta;
    }

    try {
      // BATCH_AGENDAMENTO recebe subtarefas como 5º argumento em sessões novas
      const subtarefas =
        plano.dominio === 'BATCH_AGENDAMENTO' && plano.acao === 'NOVA_SESSAO'
          ? contexto.subtarefas
          : null;

      const resultado = await servico.processar(
        mensagem,
        contextoUsuario,
        plano.sessao_alvo || null,
        plano.acao_contexto || null,
        subtarefas
      );

      contexto.resposta = resultado;
      adicionarAuditoria(contexto, {
        agente: 'ExecutionAgent',
        acao: `EXECUTADO_${plano.dominio}`,
        tipo_acao: plano.acao,
      });

      return resultado;
    } catch (err) {
      console.error(`[EXECUTION_AGENT] Erro ao executar ${plano.dominio}:`, err.message);
      const resposta = respostaAgente('Tive um problema ao processar sua solicitação. Poderia repetir?');
      contexto.resposta = resposta;
      adicionarAuditoria(contexto, {
        agente: 'ExecutionAgent',
        acao: 'ERRO_EXECUCAO',
        erro: err.message,
      });
      return resposta;
    }
  },
};
