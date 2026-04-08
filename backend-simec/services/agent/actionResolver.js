// simec/backend-simec/services/agent/actionResolver.js

function normalizarMensagem(mensagem = '') {
    return mensagem.toLowerCase().trim();
}

function contemAlgum(msg, termos = []) {
    return termos.some(t => msg.includes(t));
}

export const ACTIONS = {
    GERAR_PDF: 'GERAR_PDF',
    GERAR_PDF_OS: 'GERAR_PDF_OS',
    GERAR_PDF_RELATORIO: 'GERAR_PDF_RELATORIO',
    ABRIR_OS: 'ABRIR_OS',
    MOSTRAR_COBERTURA: 'MOSTRAR_COBERTURA',
    MOSTRAR_VENCIMENTO: 'MOSTRAR_VENCIMENTO',
    CONFIRMAR_ACAO: 'CONFIRMAR_ACAO',
    CANCELAR_ACAO: 'CANCELAR_ACAO'
};

/**
 * Detecta ação explícita na mensagem.
 */
export function detectarAcao(mensagem) {
    const msg = normalizarMensagem(mensagem);

    const termosConfirmacao = ['sim', 'ok', 'confirmar', 'pode', 'pode sim'];
    const termosCancelamento = ['não', 'nao', 'cancela', 'cancelar', 'parar', 'negativo'];

    const termosPdf = [
        'pdf',
        'gerar pdf',
        'gere o pdf',
        'gere um pdf',
        'quero o pdf',
        'imprimir',
        'imprima'
    ];

    const termosPdfOS = [
        'pdf da os',
        'pdf da ordem de serviço',
        'pdf da ordem de servico',
        'imprima a os',
        'gere a os',
        'quero a os',
        'ordem de serviço',
        'ordem de servico'
    ];

    const termosAbrirOS = [
        'abrir os',
        'abrir a os',
        'abrir ordem de serviço',
        'abrir ordem de servico',
        'mostrar os',
        'ver a os'
    ];

    const termosCobertura = [
        'cobertura',
        'coberturas',
        'o que cobre',
        'me mostre a cobertura',
        'mostrar cobertura'
    ];

    const termosVencimento = [
        'vencimento',
        'vence',
        'quando vence',
        'validade',
        'data de vencimento'
    ];

    if (contemAlgum(msg, termosPdfOS)) {
        return ACTIONS.GERAR_PDF_OS;
    }

    if (contemAlgum(msg, termosPdf)) {
        return ACTIONS.GERAR_PDF;
    }

    if (contemAlgum(msg, termosAbrirOS)) {
        return ACTIONS.ABRIR_OS;
    }

    if (contemAlgum(msg, termosCobertura)) {
        return ACTIONS.MOSTRAR_COBERTURA;
    }

    if (contemAlgum(msg, termosVencimento)) {
        return ACTIONS.MOSTRAR_VENCIMENTO;
    }

    if (termosConfirmacao.includes(msg)) {
        return ACTIONS.CONFIRMAR_ACAO;
    }

    if (termosCancelamento.includes(msg)) {
        return ACTIONS.CANCELAR_ACAO;
    }

    return null;
}

/**
 * Tenta resolver a ação com base no contexto salvo na sessão.
 */
export function resolverAcaoPorContexto(sessao, mensagem) {
    if (!sessao?.stateJson) return null;

    const action = detectarAcao(mensagem);
    if (!action) return null;

    const state = JSON.parse(sessao.stateJson || '{}');
    const contextoPDF = state?.contextoPDF || null;

    // RELATORIO
    if (sessao.intent === 'RELATORIO') {
        if (
            [ACTIONS.GERAR_PDF, ACTIONS.GERAR_PDF_OS, ACTIONS.CONFIRMAR_ACAO].includes(action) &&
            contextoPDF
        ) {
            if (
                contextoPDF.tipo === 'OS_MANUTENCAO' &&
                [ACTIONS.GERAR_PDF, ACTIONS.GERAR_PDF_OS, ACTIONS.CONFIRMAR_ACAO].includes(action)
            ) {
                return {
                    matched: true,
                    action: ACTIONS.GERAR_PDF_OS,
                    domain: 'RELATORIO',
                    context: contextoPDF,
                    state
                };
            }

            if (
                contextoPDF.tipo === 'RELATORIO_MANUTENCOES' &&
                [ACTIONS.GERAR_PDF, ACTIONS.CONFIRMAR_ACAO].includes(action)
            ) {
                return {
                    matched: true,
                    action: ACTIONS.GERAR_PDF_RELATORIO,
                    domain: 'RELATORIO',
                    context: contextoPDF,
                    state
                };
            }
        }
    }

    // Espaço preparado para módulos futuros
    if (sessao.intent === 'SEGURO') {
        if (
            [ACTIONS.GERAR_PDF, ACTIONS.CONFIRMAR_ACAO].includes(action) &&
            contextoPDF
        ) {
            return {
                matched: true,
                action: ACTIONS.GERAR_PDF,
                domain: 'SEGURO',
                context: contextoPDF,
                state
            };
        }

        if (action === ACTIONS.MOSTRAR_COBERTURA) {
            return {
                matched: true,
                action,
                domain: 'SEGURO',
                context: state,
                state
            };
        }

        if (action === ACTIONS.MOSTRAR_VENCIMENTO) {
            return {
                matched: true,
                action,
                domain: 'SEGURO',
                context: state,
                state
            };
        }
    }

    return null;
}