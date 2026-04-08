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
        'corretivas',
        'quando foi a ultima',
        'quando foi a última',
        'qual a ultima',
        'qual a última',
        'me diga a ultima',
        'me diga a última',
        'última preventiva',
        'ultima preventiva',
        'última corretiva',
        'ultima corretiva',
        'última manutenção',
        'ultima manutenção',
        'último atendimento',
        'ultimo atendimento'
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
        'preciso agendar',
        'gostaria de agendar',
        'preciso marcar',
        'quero marcar',
        'gostaria de marcar',
        'preciso abrir uma corretiva',
        'preciso abrir uma preventiva',
        'preciso agendar uma corretiva',
        'preciso agendar uma preventiva',
        'quero agendar uma corretiva',
        'quero agendar uma preventiva',
        'marcar uma corretiva',
        'marcar uma preventiva',
        'abrir uma corretiva',
        'abrir uma preventiva'
    ];

    return termosAgendamento.some(t => msg.includes(t));
}

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
        'documento do seguro',
        'preciso do seguro',
        'quero o seguro',
        'me traga o seguro',
        'me mostra o seguro',
        'me mostre o seguro',
        'quero a apólice',
        'quero a apolice',
        'me traga a apólice',
        'me traga a apolice',
        'qual a apólice',
        'qual a apolice'
    ];

    return termosSeguro.some(t => msg.includes(t));
}

async function cancelarSessaoSeExistir(sessao, mensagem) {
    if (!sessao) return;

    await AgentSessionRepository.cancelarSessao(sessao.id);
    await AgentSessionRepository.registrarMensagem(
        sessao.id,
        'user',
        mensagem,
        { acao: 'TROCA_DE_INTENCAO' }
    );
}

/**
 * Maestro do Agente
 */
export const RoteadorAgente = async (mensagem, usuarioNome) => {
    try {
        const msgMinuscula = mensagem.toLowerCase().trim();

        // 1. Expira sessões antigas
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

        const sessaoSeguro = await AgentSessionRepository.buscarSessaoAtiva(
            usuarioNome,
            'SEGURO'
        );

        const temAgendamentoAtivo = !!sessaoAgendamento;
        const temRelatorioAtivo = !!sessaoRelatorio;
        const temSeguroAtivo = !!sessaoSeguro;

        // 3. Reset manual explícito
        if (RESET_COMMANDS.some(cmd => msgMinuscula.includes(cmd))) {
            await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
            await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
            await cancelarSessaoSeExistir(sessaoSeguro, mensagem);

            return {
                mensagem: 'Certo, vamos começar de novo. Como posso ajudar?'
            };
        }

        // 4. Ação contextual primeiro
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

        // 5. Classifica intenção cedo
        let intencao = await classificarIntencao(mensagem);

        if (intencao === 'OUTRO' && pareceSeguro(msgMinuscula)) {
            intencao = 'SEGURO';
        }

        if (intencao === 'OUTRO' && pareceConsultaRelatorio(msgMinuscula)) {
            intencao = 'RELATORIO';
        }

        if (intencao === 'OUTRO' && pareceAgendamento(msgMinuscula)) {
            intencao = 'AGENDAR_MANUTENCAO';
        }

        // Desempate: seguro > agendamento > relatório
        if (pareceSeguro(msgMinuscula)) {
            intencao = 'SEGURO';
        } else if (pareceAgendamento(msgMinuscula)) {
            intencao = 'AGENDAR_MANUTENCAO';
        } else if (pareceConsultaRelatorio(msgMinuscula)) {
            intencao = 'RELATORIO';
        }

        console.log(
            `[AGENT_ROUTER] Usuário: ${usuarioNome} | AgendamentoAtivo: ${temAgendamentoAtivo} | RelatorioAtivo: ${temRelatorioAtivo} | SeguroAtivo: ${temSeguroAtivo} | Intenção: ${intencao}`
        );

        // 6. Troca explícita de intenção
        if (intencao === 'AGENDAR_MANUTENCAO') {
            if (sessaoRelatorio) {
                await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
            }
            if (sessaoSeguro) {
                await cancelarSessaoSeExistir(sessaoSeguro, mensagem);
            }

            return await AgendamentoService.processar(
                mensagem,
                usuarioNome,
                sessaoAgendamento || null
            );
        }

        if (intencao === 'RELATORIO') {
            if (sessaoAgendamento) {
                await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
            }
            if (sessaoSeguro) {
                await cancelarSessaoSeExistir(sessaoSeguro, mensagem);
            }

            return await RelatorioService.processar(
                mensagem,
                usuarioNome,
                sessaoRelatorio || null,
                null
            );
        }

        if (intencao === 'SEGURO') {
            if (sessaoAgendamento) {
                await cancelarSessaoSeExistir(sessaoAgendamento, mensagem);
            }
            if (sessaoRelatorio) {
                await cancelarSessaoSeExistir(sessaoRelatorio, mensagem);
            }

            return await SeguroService.processar(
                mensagem,
                usuarioNome,
                sessaoSeguro || null,
                null
            );
        }

        // 7. Se não houve intenção nova clara, continua fluxo ativo
        if (temAgendamentoAtivo) {
            return await AgendamentoService.processar(
                mensagem,
                usuarioNome,
                sessaoAgendamento
            );
        }

        if (temRelatorioAtivo) {
            return await RelatorioService.processar(
                mensagem,
                usuarioNome,
                sessaoRelatorio,
                null
            );
        }

        if (temSeguroAtivo) {
            return await SeguroService.processar(
                mensagem,
                usuarioNome,
                sessaoSeguro,
                null
            );
        }

        // 8. Fallback
        return {
            mensagem: 'Olá! Sou a SIMEC-IA. Posso ajudar com agendamentos, relatórios e consultas de seguros. Como posso ajudar?'
        };
    } catch (error) {
        console.error('[AGENT_ROUTER_ERROR] Erro crítico no roteamento:', error);

        return {
            mensagem: 'Tive um problema técnico ao processar sua mensagem. Poderia repetir de forma mais direta?'
        };
    }
};