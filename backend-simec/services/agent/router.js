// simec/backend-simec/services/agent/router.js
import { AgendamentoService } from './agendamentoService.js';
import { RelatorioService } from './relatorioService.js';
import { classificarIntencao } from './intentClassifier.js';
import { AgentSessionRepository } from './agentSessionRepository.js';
import { resolverAcaoPorContexto } from './actionResolver.js';

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

        // 2. Busca sessões ativas
        const sessaoAgendamento = await AgentSessionRepository.buscarSessaoAtiva(
            usuarioNome,
            'AGENDAR_MANUTENCAO'
        );

        const sessaoRelatorio = await AgentSessionRepository.buscarSessaoAtiva(
            usuarioNome,
            'RELATORIO'
        );

        const temAgendamentoAtivo = !!sessaoAgendamento;
        const temRelatorioAtivo = !!sessaoRelatorio;

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
            }

            if (sessaoRelatorio) {
                await AgentSessionRepository.cancelarSessao(sessaoRelatorio.id);
                await AgentSessionRepository.registrarMensagem(
                    sessaoRelatorio.id,
                    'user',
                    mensagem,
                    { acao: 'RESET_MANUAL' }
                );
            }

            return "Certo, vamos começar de novo. Como posso ajudar?";
        }

        // 4. Primeiro tenta resolver ação sobre contexto anterior
        const acaoRelatorio = sessaoRelatorio
            ? resolverAcaoPorContexto(sessaoRelatorio, mensagem)
            : null;

        if (acaoRelatorio?.matched) {
            console.log(`[ROUTER] Ação contextual detectada para RELATORIO: ${acaoRelatorio.action}`);
            return await RelatorioService.processar(
                mensagem,
                usuarioNome,
                sessaoRelatorio,
                acaoRelatorio
            );
        }

        // 5. Classificação de intenção
        let intencao = await classificarIntencao(mensagem);

        // 6. Heurísticas de segurança
        if (intencao === 'OUTRO' && pareceConsultaRelatorio(msgMinuscula)) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para RELATORIO`);
            intencao = 'RELATORIO';
        }

        if (intencao === 'OUTRO' && pareceAgendamento(msgMinuscula)) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para AGENDAR_MANUTENCAO`);
            intencao = 'AGENDAR_MANUTENCAO';
        }

        if (pareceConsultaRelatorio(msgMinuscula)) {
            intencao = 'RELATORIO';
        }

        console.log(
            `[AGENT_ROUTER] Usuário: ${usuarioNome} | AgendamentoAtivo: ${temAgendamentoAtivo} | RelatorioAtivo: ${temRelatorioAtivo} | Intenção: ${intencao}`
        );

        // 7. Prioridade: continuar agendamento ativo
        if (temAgendamentoAtivo) {
            return await AgendamentoService.processar(mensagem, usuarioNome, sessaoAgendamento);
        }

        // 8. Prioridade: continuar relatório ativo
        if (temRelatorioAtivo) {
            return await RelatorioService.processar(mensagem, usuarioNome, sessaoRelatorio, null);
        }

        // 9. Estratégia padrão
        const executor = STRATEGIES[intencao];
        if (executor) {
            return await executor.processar(mensagem, usuarioNome, null, null);
        }

        // 10. Fallback
        return "Olá! Sou a SIMEC-IA. Posso ajudar com **agendamentos**, **consultas de histórico** e **relatórios de manutenção**. Como posso ajudar?";
    } catch (error) {
        console.error(`[AGENT_ROUTER_ERROR] Erro crítico no roteamento:`, error.message);
        return "Tive um problema técnico ao processar sua mensagem. Poderia repetir de forma mais direta?";
    }
};