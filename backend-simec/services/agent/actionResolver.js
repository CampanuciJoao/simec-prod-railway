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
    ABRIR_DOCUMENTO: 'ABRIR_DOCUMENTO',
    MOSTRAR_COBERTURA: 'MOSTRAR_COBERTURA',
    MOSTRAR_VENCIMENTO: 'MOSTRAR_VENCIMENTO',
    MOSTRAR_DADOS_APOLICE: 'MOSTRAR_DADOS_APOLICE',
    CONFIRMAR_ACAO: 'CONFIRMAR_ACAO',
    CANCELAR_ACAO: 'CANCELAR_ACAO'
};

export const DOMAINS = {
    RELATORIO: 'RELATORIO',
    SEGURO: 'SEGURO',
    CONTRATO: 'CONTRATO'
};

/**
 * Detecta a ação solicitada pelo usuário.
 */
export function detectarAcao(mensagem) {
    const msg = normalizarMensagem(mensagem);

    const termosConfirmacao = ['sim', 'ok', 'confirmar', 'pode'];
    const termosCancelamento = ['não', 'nao', 'cancela', 'cancelar', 'parar'];

    const termosPdfOS = ['pdf da os', 'imprima a os', 'gere a os', 'ordem de serviço'];
    const termosAbrirOS = ['abrir os', 'ver a os', 'mostrar os'];
    const termosAbrirDocumento = ['abrir documento', 'abrir pdf', 'abrir arquivo'];

    const termosCobertura = ['cobertura', 'o que cobre'];
    const termosVencimento = ['vencimento', 'quando vence', 'validade'];
    const termosDadosApolice = ['dados do seguro', 'detalhes do seguro'];

    if (contemAlgum(msg, termosPdfOS)) return ACTIONS.GERAR_PDF_OS;
    if (contemAlgum(msg, termosAbrirOS)) return ACTIONS.ABRIR_OS;
    if (contemAlgum(msg, termosAbrirDocumento)) return ACTIONS.ABRIR_DOCUMENTO;
    if (contemAlgum(msg, termosCobertura)) return ACTIONS.MOSTRAR_COBERTURA;
    if (contemAlgum(msg, termosVencimento)) return ACTIONS.MOSTRAR_VENCIMENTO;
    if (contemAlgum(msg, termosDadosApolice)) return ACTIONS.MOSTRAR_DADOS_APOLICE;

    // 👇 CONFIRMAÇÃO FLEXÍVEL (CORRIGIDO)
    if (contemAlgum(msg, termosConfirmacao)) return ACTIONS.CONFIRMAR_ACAO;

    if (contemAlgum(msg, termosCancelamento)) return ACTIONS.CANCELAR_ACAO;

    if (msg.includes('pdf') || msg.includes('imprimir')) {
        return ACTIONS.GERAR_PDF;
    }

    return null;
}

/**
 * Normaliza o contexto independente de onde veio
 */
function extrairContexto(state) {
    return (
        state?.contextoPDF ||
        state?.contexto ||
        state?.meta ||
        null
    );
}

/**
 * Resolve ação para relatório
 */
function resolverAcaoRelatorio(state, action) {
    const contexto = extrairContexto(state);

    if (!contexto) return null;

    const tipo = contexto.tipo;

    // OS
    if (
        tipo === 'OS_MANUTENCAO' &&
        [ACTIONS.GERAR_PDF, ACTIONS.GERAR_PDF_OS, ACTIONS.CONFIRMAR_ACAO].includes(action)
    ) {
        return {
            matched: true,
            domain: DOMAINS.RELATORIO,
            action: ACTIONS.GERAR_PDF_OS,
            context: contexto,
            state
        };
    }

    // RELATÓRIO
    if (
        tipo === 'RELATORIO_MANUTENCOES' &&
        [ACTIONS.GERAR_PDF, ACTIONS.CONFIRMAR_ACAO].includes(action)
    ) {
        return {
            matched: true,
            domain: DOMAINS.RELATORIO,
            action: ACTIONS.GERAR_PDF_RELATORIO,
            context: contexto,
            state
        };
    }

    // Abrir OS
    if (tipo === 'OS_MANUTENCAO' && action === ACTIONS.ABRIR_OS) {
        return {
            matched: true,
            domain: DOMAINS.RELATORIO,
            action: ACTIONS.ABRIR_OS,
            context: contexto,
            state
        };
    }

    return null;
}

/**
 * Resolve ação para seguro (futuro)
 */
function resolverAcaoSeguro(state, action) {
    const contexto = extrairContexto(state);

    if (!contexto) return null;

    if ([ACTIONS.GERAR_PDF, ACTIONS.CONFIRMAR_ACAO].includes(action)) {
        return {
            matched: true,
            domain: DOMAINS.SEGURO,
            action: ACTIONS.GERAR_PDF,
            context: contexto,
            state
        };
    }

    if (action === ACTIONS.MOSTRAR_COBERTURA) {
        return { matched: true, domain: DOMAINS.SEGURO, action, context: state };
    }

    if (action === ACTIONS.MOSTRAR_VENCIMENTO) {
        return { matched: true, domain: DOMAINS.SEGURO, action, context: state };
    }

    return null;
}

/**
 * Resolve ação para contrato (futuro)
 */
function resolverAcaoContrato(state, action) {
    const contexto = extrairContexto(state);

    if (!contexto) return null;

    if ([ACTIONS.GERAR_PDF, ACTIONS.CONFIRMAR_ACAO].includes(action)) {
        return {
            matched: true,
            domain: DOMAINS.CONTRATO,
            action: ACTIONS.GERAR_PDF,
            context: contexto,
            state
        };
    }

    return null;
}

/**
 * Entrada principal
 */
export function resolverAcaoPorContexto(sessao, mensagem) {
    if (!sessao?.stateJson) return null;

    const action = detectarAcao(mensagem);
    if (!action) return null;

    const state = JSON.parse(sessao.stateJson || '{}');

    if (sessao.intent === DOMAINS.RELATORIO) {
        return resolverAcaoRelatorio(state, action);
    }

    if (sessao.intent === DOMAINS.SEGURO) {
        return resolverAcaoSeguro(state, action);
    }

    if (sessao.intent === DOMAINS.CONTRATO) {
        return resolverAcaoContrato(state, action);
    }

    return null;
}