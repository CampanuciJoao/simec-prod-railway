// simec/backend-simec/services/agent/router.js
import { AgendamentoService } from './agendamentoService.js';
import { classificarIntencao } from './intentClassifier.js';
import { AgentSessionRepository } from './agentSessionRepository.js';

/**
 * Mapa de Estratégias (Habilidades do Agente)
 */
const STRATEGIES = {
    AGENDAR_MANUTENCAO: AgendamentoService,
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
        const sessaoAtiva = await AgentSessionRepository.buscarSessaoAtiva(
            usuarioNome,
            'AGENDAR_MANUTENCAO'
        );

        const temProcessoAtivo = !!sessaoAtiva;

        // 3. Reset manual explícito
        if (RESET_COMMANDS.some(cmd => msgMinuscula.includes(cmd))) {
            if (sessaoAtiva) {
                await AgentSessionRepository.cancelarSessao(sessaoAtiva.id);
                await AgentSessionRepository.registrarMensagem(
                    sessaoAtiva.id,
                    'user',
                    mensagem,
                    { acao: 'RESET_MANUAL' }
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

        // 6. Se já existe sessão ativa, prioriza continuidade do fluxo
        if (temProcessoAtivo) {
            return await AgendamentoService.processar(mensagem, usuarioNome, sessaoAtiva);
        }

        // 7. Se é novo pedido de agendamento
        if (intencao === 'AGENDAR_MANUTENCAO') {
            return await AgendamentoService.processar(mensagem, usuarioNome, null);
        }

        // 8. Fallback amigável
        return "Olá! Sou o Agente Guardião do SIMEC. No momento, sou especialista em **agendar manutenções** para seus equipamentos. Como posso ser útil agora?";

    } catch (error) {
        console.error(`[AGENT_ROUTER_ERROR] Erro crítico no roteamento:`, error.message);
        return "Tive um problema técnico ao processar sua mensagem. Poderia repetir de forma mais direta?";
    }
};