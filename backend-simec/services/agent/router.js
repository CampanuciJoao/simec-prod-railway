// simec/backend-simec/services/agent/router.js
import { AgendamentoService } from './agendamentoService.js';
import { RelatorioService } from './relatorioService.js';
import { classificarIntencao } from './intentClassifier.js';
import { AgentSessionRepository } from './agentSessionRepository.js';

/**
 * Mapa de Estratégias (Habilidades do Agente)
 */
const STRATEGIES = {
    AGENDAR_MANUTENCAO: AgendamentoService,
    RELATORIO: RelatorioService,
};

/**
 * Frases que forçam reset manual do fluxo
 */
const RESET_COMMANDS = [
    'vamos recomeçar',
    'recomeçar',
    'começar de novo',
    'reiniciar',
    'novo agendamento',
    'cancelar isso',
    'resetar'
];

/**
 * Maestro do Agente: Orquestra a conversa, mantendo contexto via AgentSession.
 */
export const RoteadorAgente = async (mensagem, usuarioNome) => {
    try {
        const msgMinuscula = mensagem.toLowerCase().trim();

        // 1. Expira sessões antigas do usuário
        await AgentSessionRepository.expirarSessoesAntigas(usuarioNome);

        // 2. Busca sessão ativa de agendamento
        const sessaoAgendamento = await AgentSessionRepository.buscarSessaoAtiva(
            usuarioNome,
            'AGENDAR_MANUTENCAO'
        );

        const temProcessoAtivo = !!sessaoAgendamento;

        // 3. Reset manual explícito
        if (RESET_COMMANDS.some(cmd => msgMinuscula.includes(cmd))) {
            if (sessaoAgendamento) {
                await AgentSessionRepository.cancelarSessao(sessaoAgendamento.id);

                await AgentSessionRepository.registrarMensagem(
                    sessaoAgendamento.id,
                    'user',
                    mensagem,
                    { acao: 'RESET_MANUAL' }
                );

                await AgentSessionRepository.registrarMensagem(
                    sessaoAgendamento.id,
                    'agent',
                    "Certo, vamos começar de novo. Qual manutenção você deseja agendar?",
                    { acao: 'RESET_MANUAL_CONFIRMACAO' }
                );
            }

            return "Certo, vamos começar de novo. Qual manutenção você deseja agendar?";
        }

        // 4. Classificação de intenção
        let intencao = await classificarIntencao(mensagem);

        // 5. Heurística de segurança para agendamento
        const termosChaveAgendamento = [
            'agendar',
            'marcar',
            'manutenção',
            'corretiva',
            'preventiva',
            'conserto',
            'os',
            'abrir'
        ];

        if (intencao === 'OUTRO' && termosChaveAgendamento.some(t => msgMinuscula.includes(t))) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para AGENDAR_MANUTENCAO`);
            intencao = 'AGENDAR_MANUTENCAO';
        }

        console.log(
            `[AGENT_ROUTER] Usuário: ${usuarioNome} | Ativo: ${temProcessoAtivo} | Intenção: ${intencao}`
        );

        // 6. Se já existe sessão ativa de agendamento, prioriza continuidade do fluxo
        if (temProcessoAtivo) {
            return await AgendamentoService.processar(mensagem, usuarioNome, sessaoAgendamento);
        }

        // 7. Se houver estratégia correspondente, delega para ela
        const executor = STRATEGIES[intencao];
        if (executor) {
            return await executor.processar(mensagem, usuarioNome, null);
        }

        // 8. Fallback amigável
        return "Olá! Sou o Agente Guardião do SIMEC. Posso ajudar com **agendamentos**, **consultas de histórico** e **relatórios de manutenção**. Como posso ser útil agora?";

    } catch (error) {
        console.error(`[AGENT_ROUTER_ERROR] Erro crítico no roteamento:`, error.message);
        return "Tive um problema técnico ao processar sua mensagem. Poderia repetir de forma mais direta?";
    }
};