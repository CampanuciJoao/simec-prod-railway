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
    const { agendamento, relatorio, seguro } = sessoes;
    const intent = interpretacao?.intent || 'OUTRO';

    if (ehComandoReset(mensagem)) {
      const plano = {
        acao: 'RESET',
        dominio: null,
        sessao_alvo: null,
        acao_contexto: null,
        cancelar_sessoes: [agendamento, relatorio, seguro].filter(Boolean),
        raciocinio: 'Comando de reset detectado',
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
