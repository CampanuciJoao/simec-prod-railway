import { AgendamentoService } from '../agendamento/agendamentoService.js';
import { RelatorioService } from '../relatorio/relatorioService.js';
import { SeguroService } from '../seguro/seguroService.js';
import { AnalyticsService } from '../analytics/analyticsService.js';
import { BatchAgendamentoService } from '../batch/batchAgendamentoService.js';
import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { respostaAgente } from '../core/agentResponse.js';
import { adicionarAuditoria } from '../orchestrator/AgentContext.js';
import { responderConversacional } from '../conversacao/conversacaoService.js';

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

// Busca o historico recente de mensagens do usuario (de qualquer sessao)
// para alimentar o fallback conversacional com continuidade.
async function obterHistoricoRecente(contexto) {
  try {
    const { sessionKey, tenantId } = contexto;
    if (!sessionKey || !tenantId) return [];
    return await AgentSessionRepository.listarMensagensRecentesDoUsuario({
      usuario: sessionKey,
      tenantId,
      limite: 12,
    });
  } catch (e) {
    console.warn('[EXECUTION_AGENT] Falha ao buscar historico:', e.message);
    return [];
  }
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
    const { mensagem, usuarioId, usuarioNome, tenantId, tenantTimezone = 'UTC', plano, validacao } = contexto;

    if (!validacao?.aprovado) {
      const resposta = respostaAgente(
        validacao?.bloqueios?.[0] || 'Não foi possível processar sua solicitação.'
      );
      contexto.resposta = resposta;
      adicionarAuditoria(contexto, { agente: 'ExecutionAgent', acao: 'BLOQUEADO_POR_VALIDACAO' });
      return resposta;
    }

    const contextoUsuario = { usuarioId, usuarioNome, tenantId, tenantTimezone };

    // Pede confirmacao explicita de intent antes de criar sessao. Acionado
    // pelo Planner quando confianca < 0.85 em AGENDAR vs RELATORIO. Mostra
    // 2 sugestoes ortogonais ("agendar nova" / "consultar historico") —
    // o usuario clica e a proxima mensagem caira na heuristica forte
    // (TERMOS_CONSULTA_FORTES ou TERMOS_AGENDAMENTO_FORTES).
    if (plano.acao === 'PEDIR_CONFIRMACAO_INTENT') {
      const intent = plano.intent_proposto;
      const mensagem =
        intent === 'AGENDAR_MANUTENCAO'
          ? 'Não tenho certeza se você quer **agendar uma nova manutenção** ou **consultar o histórico**. Qual dos dois?'
          : 'Não tenho certeza se você quer **consultar o histórico** ou **agendar uma nova manutenção**. Qual dos dois?';

      // Renderizado pelo ChatMessageBubble como botoes clicaveis. Cada
      // botao envia 'message' como nova mensagem do usuario, que cai
      // direto na heuristica forte (TERMOS_CONSULTA_FORTES ou
      // TERMOS_AGENDAMENTO_FORTES) e roteia certo.
      const resposta = respostaAgente(mensagem, {
        meta: {
          intent: 'CONFIRMACAO_INTENT',
          intent_proposto: intent,
          confianca: plano.confianca,
          actions: [
            { id: 'consultar', label: 'Consultar histórico', message: 'quero saber o histórico', variant: 'primary' },
            { id: 'agendar', label: 'Agendar nova manutenção', message: 'quero agendar uma manutenção', variant: 'secondary' },
          ],
        },
      });
      contexto.resposta = resposta;
      adicionarAuditoria(contexto, {
        agente: 'ExecutionAgent',
        acao: 'CONFIRMACAO_INTENT_PEDIDA',
        intent_proposto: intent,
        confianca: plano.confianca,
      });
      return resposta;
    }

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
      // Fallback conversacional via LLM. Quando intent=AMBIGUO (verbo de
      // acao detectado mas tipo nao claro — ex: 'abrir chamado'), usa
      // prompt especifico de desambiguacao que lista as 3 opcoes
      // (Ocorrencia / OS Corretiva / Preventiva).
      const intentParaConversa = plano.intent || contexto.interpretacao?.intent || 'OUTRO';
      try {
        const historico = await obterHistoricoRecente(contexto);
        const respostaConv = await responderConversacional({
          mensagem,
          historico,
          contextoUsuario,
          intent: intentParaConversa,
          logContext: {
            requestId: contexto.requestId,
            tenantId,
            usuarioId,
            usuarioNome,
            intent: intentParaConversa,
          },
        });

        const resposta = respostaAgente(respostaConv.mensagem, {
          meta: respostaConv.meta,
        });
        contexto.resposta = resposta;
        adicionarAuditoria(contexto, { agente: 'ExecutionAgent', acao: 'CONVERSACAO_LLM' });
        return resposta;
      } catch (err) {
        console.error('[EXECUTION_AGENT] Erro no fallback conversacional:', err.message);
        // Cai pro hardcoded se LLM falhar — pior caso, comportamento atual
        const resposta = respostaAgente(
          'Olá! Sou a T.H.I.A.G.O. Posso ajudar com agendamentos, relatórios, seguros e análises. Como posso ajudar?'
        );
        contexto.resposta = resposta;
        adicionarAuditoria(contexto, { agente: 'ExecutionAgent', acao: 'SAUDACAO_FALLBACK' });
        return resposta;
      }
    }

    for (const sessao of plano.cancelar_sessoes) {
      await cancelarSessao(sessao, mensagem);
    }

    // Pré-popular sessão de agendamento com entidades extraídas — APENAS
    // quando confianca de interpretacao >= 0.85. Confianca menor passa
    // antes pelo PEDIR_CONFIRMACAO_INTENT, mas como defesa em profundidade
    // tambem nao pre-populamos aqui. Evita criar sessao no caminho errado
    // quando intent foi classificado por LLM com baixa certeza.
    const confiancaInterpretacao = contexto.interpretacao?.confianca ?? 0;
    if (
      plano.acao === 'NOVA_SESSAO' &&
      plano.dominio === 'AGENDAMENTO' &&
      confiancaInterpretacao >= 0.85
    ) {
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
