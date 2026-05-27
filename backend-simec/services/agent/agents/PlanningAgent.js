import { resolverAcaoPorContexto } from '../shared/actionResolver.js';
import { adicionarAuditoria } from '../orchestrator/AgentContext.js';
import { RESET_COMMANDS } from '../router/resetCommands.js';

function ehComandoReset(mensagem) {
  const msg = mensagem.toLowerCase().trim();
  return RESET_COMMANDS.some((cmd) => msg.includes(cmd));
}

export const PlanningAgent = {
  nome: 'PlanningAgent',
  capacidades: ['planejar_rota', 'resolver_acao_contexto', 'detectar_troca_intencao'],

  async executar(contexto) {
    const { mensagem, sessoes, interpretacao } = contexto;
    const { agendamento, relatorio, seguro, batch } = sessoes;
    const intent = interpretacao?.intent || 'OUTRO';

    if (ehComandoReset(mensagem)) {
      const plano = {
        acao: 'RESET',
        dominio: null,
        sessao_alvo: null,
        acao_contexto: null,
        cancelar_sessoes: [agendamento, relatorio, seguro, batch].filter(Boolean),
        raciocinio: 'Comando de reset detectado',
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    // AMBIGUO — usuario quer iniciar acao mas tipo nao foi claro
    // (ex: "abrir chamado" -> ocorrencia? OS corretiva? preventiva?).
    // Roteia pro fallback conversacional com prompt de desambiguacao.
    if (intent === 'AMBIGUO') {
      const plano = {
        acao: 'RESPONDER_SAUDACAO',
        dominio: null,
        sessao_alvo: null,
        acao_contexto: null,
        cancelar_sessoes: [],
        intent: 'AMBIGUO',
        raciocinio: 'Mensagem ambígua — pedindo desambiguação ao usuário',
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    // Confianca baixa em AGENDAR vs RELATORIO — pede confirmacao explicita
    // ao usuario ANTES de criar sessao. Resolve o caso classico onde a
    // pergunta "quando foi a ultima preventiva" caia errado em AGENDAR
    // (LLM via palavras como "preventiva" + "unidade"). So aciona quando:
    //   - intent ainda eh ambiguo (AGENDAR ou RELATORIO)
    //   - confianca < 0.85 (heuristica forte tem 0.92, passa direto)
    //   - nao ha sessao ativa que ja contextualize a conversa
    const INTENTS_AMBIGUOS_FREQUENTES = ['AGENDAR_MANUTENCAO', 'RELATORIO'];
    const confianca = interpretacao?.confianca ?? 0;
    const semSessaoAtiva = !agendamento && !relatorio && !seguro && !batch;
    if (
      INTENTS_AMBIGUOS_FREQUENTES.includes(intent) &&
      confianca < 0.85 &&
      semSessaoAtiva
    ) {
      const plano = {
        acao: 'PEDIR_CONFIRMACAO_INTENT',
        dominio: null,
        sessao_alvo: null,
        acao_contexto: null,
        cancelar_sessoes: [],
        intent_proposto: intent,
        confianca,
        raciocinio: `Confiança ${confianca.toFixed(2)} abaixo do limiar 0.85 — pedindo confirmação`,
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    // ANALYTICS é sempre stateless — não depende de sessão ativa
    if (intent === 'ANALYTICS') {
      const plano = {
        acao: 'EXECUTAR_ANALYTICS',
        dominio: 'ANALYTICS',
        sessao_alvo: null,
        acao_contexto: null,
        cancelar_sessoes: [],
        raciocinio: 'Consulta analítica agregada — sem sessão necessária',
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    // Verificar ação de contexto em sessões ativas (PDF, confirmação, etc.)
    const verificacoes = [
      { sessao: agendamento, dominio: 'AGENDAMENTO' },
      { sessao: relatorio, dominio: 'RELATORIO' },
      { sessao: seguro, dominio: 'SEGURO' },
      { sessao: batch, dominio: 'BATCH_AGENDAMENTO' },
    ];

    for (const { sessao, dominio } of verificacoes) {
      if (!sessao) continue;
      const acao = resolverAcaoPorContexto(sessao, mensagem);
      if (acao?.matched) {
        const plano = {
          acao: 'CONTINUAR_SESSAO',
          dominio,
          sessao_alvo: sessao,
          acao_contexto: acao,
          cancelar_sessoes: [],
          raciocinio: `Ação de contexto detectada em sessão de ${dominio}: ${acao.action}`,
        };
        contexto.plano = plano;
        adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
        return plano;
      }
    }

    // Roteamento por intenção
    const mapa = {
      BATCH_AGENDAMENTO: {
        dominio: 'BATCH_AGENDAMENTO',
        sessao_alvo: batch,
        cancelar: [agendamento, relatorio, seguro].filter(Boolean),
      },
      AGENDAR_MANUTENCAO: {
        dominio: 'AGENDAMENTO',
        sessao_alvo: agendamento,
        cancelar: [relatorio, seguro].filter(Boolean),
      },
      RELATORIO: {
        dominio: 'RELATORIO',
        sessao_alvo: relatorio,
        cancelar: [agendamento, seguro].filter(Boolean),
      },
      SEGURO: {
        dominio: 'SEGURO',
        sessao_alvo: seguro,
        cancelar: [agendamento, relatorio].filter(Boolean),
      },
    };

    if (mapa[intent]) {
      const { dominio, sessao_alvo, cancelar } = mapa[intent];
      const plano = {
        acao: sessao_alvo ? 'CONTINUAR_SESSAO' : 'NOVA_SESSAO',
        dominio,
        sessao_alvo: sessao_alvo || null,
        acao_contexto: null,
        cancelar_sessoes: cancelar,
        raciocinio: `Intenção: ${intent}${sessao_alvo ? ', sessão ativa retomada' : ', nova sessão iniciada'}`,
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    // Continuar sessão aberta mesmo sem intenção clara
    if (batch) {
      const plano = {
        acao: 'CONTINUAR_SESSAO',
        dominio: 'BATCH_AGENDAMENTO',
        sessao_alvo: batch,
        acao_contexto: null,
        cancelar_sessoes: [],
        raciocinio: 'Sessão de agendamento em lote ativa — continuando contexto',
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    if (agendamento) {
      const plano = {
        acao: 'CONTINUAR_SESSAO',
        dominio: 'AGENDAMENTO',
        sessao_alvo: agendamento,
        acao_contexto: null,
        cancelar_sessoes: [],
        raciocinio: 'Sessão de agendamento ativa — continuando contexto',
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    if (relatorio) {
      const plano = {
        acao: 'CONTINUAR_SESSAO',
        dominio: 'RELATORIO',
        sessao_alvo: relatorio,
        acao_contexto: null,
        cancelar_sessoes: [],
        raciocinio: 'Sessão de relatório ativa — continuando contexto',
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    if (seguro) {
      const plano = {
        acao: 'CONTINUAR_SESSAO',
        dominio: 'SEGURO',
        sessao_alvo: seguro,
        acao_contexto: null,
        cancelar_sessoes: [],
        raciocinio: 'Sessão de seguro ativa — continuando contexto',
      };
      contexto.plano = plano;
      adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
      return plano;
    }

    const plano = {
      acao: 'RESPONDER_SAUDACAO',
      dominio: null,
      sessao_alvo: null,
      acao_contexto: null,
      cancelar_sessoes: [],
      raciocinio: `Intenção '${intent}' sem domínio mapeável e sem sessão ativa`,
    };
    contexto.plano = plano;
    adicionarAuditoria(contexto, { agente: 'PlanningAgent', ...plano });
    return plano;
  },
};
