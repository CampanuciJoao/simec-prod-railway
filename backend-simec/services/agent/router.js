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

function pareceConsultaRelatorio(msg) {
    const termosConsulta = [
        'quando foi',
        'qual foi',
        'última',
        'ultima',
        'mais recente',
        'histórico',
        'historico',
        'relatório',
        'relatorio',
        'quantas',
        'quais',
        'listar',
        'liste',
        'mostrar',
        'mostre',
        'consulta',
        'feita em',
        'feitas em',
        'no período',
        'periodo',
        'último ano',
        'ultimo ano'
    ];

    return termosConsulta.some(t => msg.includes(t));
}

function pareceAgendamento(msg) {
    const termosAgendamento = [
        'agendar',
        'marcar',
        'abrir os',
        'abrir uma os',
        'abrir chamado',
        'nova manutenção',
        'novo agendamento',
        'quero agendar',
        'preciso agendar'
    ];

    return termosAgendamento.some(t => msg.includes(t));
}

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

        // 5. Heurísticas de segurança
        // Se parece consulta, prioriza RELATORIO
        if (intencao === 'OUTRO' && pareceConsultaRelatorio(msgMinuscula)) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para RELATORIO`);
            intencao = 'RELATORIO';
        }

        // Se parece agendamento explícito, prioriza AGENDAR_MANUTENCAO
        if (intencao === 'OUTRO' && pareceAgendamento(msgMinuscula)) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para AGENDAR_MANUTENCAO`);
            intencao = 'AGENDAR_MANUTENCAO';
        }

        // Desempate: se tiver palavras de consulta e palavras de preventiva/corretiva,
        // consulta ganha de agendamento
        if (pareceConsultaRelatorio(msgMinuscula)) {
            intencao = 'RELATORIO';
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