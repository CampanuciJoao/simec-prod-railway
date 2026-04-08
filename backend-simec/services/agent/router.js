// simec/backend-simec/services/agent/router.js
import { AgendamentoService } from './agendamentoService.js';
import { RelatorioService } from './relatorioService.js';
import { SeguroService } from './seguroService.js';
import { classificarIntencao } from './intentClassifier.js';
import { AgentSessionRepository } from './agentSessionRepository.js';
import { resolverAcaoPorContexto } from './actionResolver.js';

/**
 * Mapa de Estratégias (Habilidades do Agente)
 */
const STRATEGIES = {
    AGENDAR_MANUTENCAO: AgendamentoService,
    RELATORIO: RelatorioService,
    SEGURO: SeguroService
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
 * Detecta se a frase parece uma consulta / relatório.
 */
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
        'ultimo ano',
        'preventivas',
        'corretivas'
    ];

    return termosConsulta.some(t => msg.includes(t));
}

/**
 * Detecta se a frase parece um pedido explícito de agendamento.
 */
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
 * Detecta se a frase parece uma consulta de seguro.
 */
function pareceSeguro(msg) {
    const termosSeguro = [
        'seguro',
        'apólice',
        'apolice',
        'seguradora',
        'cobertura',
        'coberturas',
        'vencimento do seguro',
        'vence o seguro',
        'pdf do seguro',
        'documento do seguro'
    ];

    return termosSeguro.some(t => msg.includes(t));
}

/**
 * Maestro do Agente:
 * 1. expira sessões antigas
 * 2. trata reset manual
 * 3. tenta resolver ação contextual
 * 4. continua fluxo ativo
 * 5. classifica nova intenção
 */
export const RoteadorAgente = async (mensagem, usuarioNome) => {
    try {
        const msgMinuscula = mensagem.toLowerCase().trim();

        // 1. Expira sessões antigas do usuário
        await AgentSessionRepository.expirarSessoesAntigas(usuarioNome);

        // 2. Busca sessões ativas por domínio
        const sessaoAgendamento = await AgentSessionRepository.buscarSessaoAtiva(
            usuarioNome,
            'AGENDAR_MANUTENCAO'
        );

        const sessaoRelatorio = await AgentSessionRepository.buscarSessaoAtiva(
            usuarioNome,
            'RELATORIO'
        );

        const sessaoSeguro = await AgentSessionRepository.buscarSessaoAtiva(
            usuarioNome,
            'SEGURO'
        );

        const temAgendamentoAtivo = !!sessaoAgendamento;
        const temRelatorioAtivo = !!sessaoRelatorio;
        const temSeguroAtivo = !!sessaoSeguro;

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

            if (sessaoSeguro) {
                await AgentSessionRepository.cancelarSessao(sessaoSeguro.id);
                await AgentSessionRepository.registrarMensagem(
                    sessaoSeguro.id,
                    'user',
                    mensagem,
                    { acao: 'RESET_MANUAL' }
                );
            }

            return {
                mensagem: 'Certo, vamos começar de novo. Como posso ajudar?'
            };
        }

        // 4. Tenta resolver ação contextual antes de qualquer classificação
        const acaoRelatorio = sessaoRelatorio
            ? resolverAcaoPorContexto(sessaoRelatorio, mensagem)
            : null;

        if (acaoRelatorio?.matched) {
            console.log(
                `[ROUTER] Ação contextual detectada para RELATORIO: ${acaoRelatorio.action}`
            );

            return await RelatorioService.processar(
                mensagem,
                usuarioNome,
                sessaoRelatorio,
                acaoRelatorio
            );
        }

        const acaoSeguro = sessaoSeguro
            ? resolverAcaoPorContexto(sessaoSeguro, mensagem)
            : null;

        if (acaoSeguro?.matched) {
            console.log(
                `[ROUTER] Ação contextual detectada para SEGURO: ${acaoSeguro.action}`
            );

            return await SeguroService.processar(
                mensagem,
                usuarioNome,
                sessaoSeguro,
                acaoSeguro
            );
        }

        // 5. Se já existe fluxo ativo de agendamento, continua nele
        if (temAgendamentoAtivo) {
            console.log(
                `[AGENT_ROUTER] Usuário: ${usuarioNome} | Continuando fluxo ativo de AGENDAMENTO`
            );
            return await AgendamentoService.processar(
                mensagem,
                usuarioNome,
                sessaoAgendamento
            );
        }

        // 6. Se já existe fluxo ativo de relatório, continua nele
        if (temRelatorioAtivo) {
            console.log(
                `[AGENT_ROUTER] Usuário: ${usuarioNome} | Continuando fluxo ativo de RELATORIO`
            );
            return await RelatorioService.processar(
                mensagem,
                usuarioNome,
                sessaoRelatorio,
                null
            );
        }

        // 7. Se já existe fluxo ativo de seguro, continua nele
        if (temSeguroAtivo) {
            console.log(
                `[AGENT_ROUTER] Usuário: ${usuarioNome} | Continuando fluxo ativo de SEGURO`
            );
            return await SeguroService.processar(
                mensagem,
                usuarioNome,
                sessaoSeguro,
                null
            );
        }

        // 8. Sem fluxo ativo: classifica nova intenção
        let intencao = await classificarIntencao(mensagem);

        // 9. Heurísticas de segurança
        if (intencao === 'OUTRO' && pareceSeguro(msgMinuscula)) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para SEGURO`);
            intencao = 'SEGURO';
        }

        if (intencao === 'OUTRO' && pareceConsultaRelatorio(msgMinuscula)) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para RELATORIO`);
            intencao = 'RELATORIO';
        }

        if (intencao === 'OUTRO' && pareceAgendamento(msgMinuscula)) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para AGENDAR_MANUTENCAO`);
            intencao = 'AGENDAR_MANUTENCAO';
        }

        // Regra de desempate:
        // seguro > relatório > agendamento, quando houver termos claros
        if (pareceSeguro(msgMinuscula)) {
            intencao = 'SEGURO';
        } else if (pareceConsultaRelatorio(msgMinuscula)) {
            intencao = 'RELATORIO';
        }

        console.log(
            `[AGENT_ROUTER] Usuário: ${usuarioNome} | AgendamentoAtivo: ${temAgendamentoAtivo} | RelatorioAtivo: ${temRelatorioAtivo} | SeguroAtivo: ${temSeguroAtivo} | Intenção: ${intencao}`
        );

        // 10. Estratégia padrão
        const executor = STRATEGIES[intencao];
        if (executor) {
            return await executor.processar(mensagem, usuarioNome, null, null);
        }

        // 11. Fallback
        return {
            mensagem: 'Olá! Sou a SIMEC-IA. Posso ajudar com agendamentos, relatórios e consultas de seguros. Como posso ajudar?'
        };
    } catch (error) {
        console.error(`[AGENT_ROUTER_ERROR] Erro crítico no roteamento:`, error);

        return {
            mensagem: 'Tive um problema técnico ao processar sua mensagem. Poderia repetir de forma mais direta?'
        };
    }
};