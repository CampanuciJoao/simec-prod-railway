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

export function detectarAcao(mensagem) {
    const msg = normalizarMensagem(mensagem);

    const termosConfirmacao = ['sim', 'ok', 'confirmar', 'pode', 'pode sim'];
    const termosCancelamento = ['não', 'nao', 'cancela', 'cancelar', 'parar', 'negativo'];

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
        'ver a os',
        'mostrar os'
    ];

    const termosAbrirDocumento = [
        'abrir documento',
        'abrir pdf',
        'abrir arquivo'
    ];

    const termosCobertura = [
        'cobertura',
        'coberturas',
        'o que cobre',
        'mostrar cobertura',
        'me mostre a cobertura'
    ];

    const termosVencimento = [
        'vencimento',
        'quando vence',
        'validade',
        'data de vencimento'
    ];

    const termosDadosApolice = [
        'dados do seguro',
        'detalhes do seguro',
        'dados da apólice',
        'dados da apolice'
    ];

    if (contemAlgum(msg, termosPdfOS)) return ACTIONS.GERAR_PDF_OS;
    if (contemAlgum(msg, termosAbrirOS)) return ACTIONS.ABRIR_OS;
    if (contemAlgum(msg, termosAbrirDocumento)) return ACTIONS.ABRIR_DOCUMENTO;
    if (contemAlgum(msg, termosCobertura)) return ACTIONS.MOSTRAR_COBERTURA;
    if (contemAlgum(msg, termosVencimento)) return ACTIONS.MOSTRAR_VENCIMENTO;
    if (contemAlgum(msg, termosDadosApolice)) return ACTIONS.MOSTRAR_DADOS_APOLICE;

    if (contemAlgum(msg, termosConfirmacao)) return ACTIONS.CONFIRMAR_ACAO;
    if (contemAlgum(msg, termosCancelamento)) return ACTIONS.CANCELAR_ACAO;

    if (msg.includes('pdf') || msg.includes('imprimir')) {
        return ACTIONS.GERAR_PDF;
    }

    return null;
}

function extrairContexto(state) {
    return state?.contextoPDF || state?.contexto || state?.meta || null;
}

function resolverAcaoSugerida(contexto, action, domain, state) {
    if (!contexto?.acaoSugerida) return null;

    const acoesConfirmacao = [
        ACTIONS.GERAR_PDF,
        ACTIONS.CONFIRMAR_ACAO
    ];

    if (
        contexto.acaoSugerida === ACTIONS.GERAR_PDF_OS &&
        [...acoesConfirmacao, ACTIONS.GERAR_PDF_OS].includes(action)
    ) {
        return {
            matched: true,
            domain,
            action: ACTIONS.GERAR_PDF_OS,
            context: contexto,
            state
        };
    }

    if (
        contexto.acaoSugerida === ACTIONS.GERAR_PDF_RELATORIO &&
        acoesConfirmacao.includes(action)
    ) {
        return {
            matched: true,
            domain,
            action: ACTIONS.GERAR_PDF_RELATORIO,
            context: contexto,
            state
        };
    }

    if (
        contexto.acaoSugerida === ACTIONS.GERAR_PDF &&
        acoesConfirmacao.includes(action)
    ) {
        return {
            matched: true,
            domain,
            action: ACTIONS.GERAR_PDF,
            context: contexto,
            state
        };
    }

    return null;
}

function resolverAcaoRelatorio(state, action) {
    const contexto = extrairContexto(state);

    if (!contexto) return null;

    const resolvidoPorSugestao = resolverAcaoSugerida(
        contexto,
        action,
        DOMAINS.RELATORIO,
        state
    );

    if (resolvidoPorSugestao) {
        return resolvidoPorSugestao;
    }

    const tipo = contexto.tipo;

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

    if (tipo === 'OS_MANUTENCAO' && action === ACTIONS.ABRIR_OS) {
        return {
            matched: true,
            domain: DOMAINS.RELATORIO,
            action: ACTIONS.ABRIR_OS,
            context: contexto,
            state
        };
    }

    if (tipo === 'OS_MANUTENCAO' && action === ACTIONS.ABRIR_DOCUMENTO) {
        return {
            matched: true,
            domain: DOMAINS.RELATORIO,
            action: ACTIONS.ABRIR_DOCUMENTO,
            context: contexto,
            state
        };
    }

    if (action === ACTIONS.CANCELAR_ACAO) {
        return {
            matched: true,
            domain: DOMAINS.RELATORIO,
            action: ACTIONS.CANCELAR_ACAO,
            context: contexto,
            state
        };
    }

    return null;
}

function resolverAcaoSeguro(state, action) {
    const contexto = extrairContexto(state);

    if (!contexto) return null;

    const resolvidoPorSugestao = resolverAcaoSugerida(
        contexto,
        action,
        DOMAINS.SEGURO,
        state
    );

    if (resolvidoPorSugestao) {
        return resolvidoPorSugestao;
    }

    if (action === ACTIONS.CANCELAR_ACAO) {
        return {
            matched: true,
            domain: DOMAINS.SEGURO,
            action: ACTIONS.CANCELAR_ACAO,
            context: contexto,
            state
        };
    }

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
        return {
            matched: true,
            domain: DOMAINS.SEGURO,
            action,
            context: contexto,
            state
        };
    }

    if (action === ACTIONS.MOSTRAR_VENCIMENTO) {
        return {
            matched: true,
            domain: DOMAINS.SEGURO,
            action,
            context: contexto,
            state
        };
    }

    if (action === ACTIONS.MOSTRAR_DADOS_APOLICE) {
        return {
            matched: true,
            domain: DOMAINS.SEGURO,
            action,
            context: contexto,
            state
        };
    }

    if (action === ACTIONS.ABRIR_DOCUMENTO) {
        return {
            matched: true,
            domain: DOMAINS.SEGURO,
            action,
            context: contexto,
            state
        };
    }

    return null;
}

function resolverAcaoContrato(state, action) {
    const contexto = extrairContexto(state);

    if (!contexto) return null;

    const resolvidoPorSugestao = resolverAcaoSugerida(
        contexto,
        action,
        DOMAINS.CONTRATO,
        state
    );

    if (resolvidoPorSugestao) {
        return resolvidoPorSugestao;
    }

    if ([ACTIONS.GERAR_PDF, ACTIONS.CONFIRMAR_ACAO].includes(action)) {
        return {
            matched: true,
            domain: DOMAINS.CONTRATO,
            action: ACTIONS.GERAR_PDF,
            context: contexto,
            state
        };
    }

    if (action === ACTIONS.ABRIR_DOCUMENTO) {
        return {
            matched: true,
            domain: DOMAINS.CONTRATO,
            action,
            context: contexto,
            state
        };
    }

    if (action === ACTIONS.CANCELAR_ACAO) {
        return {
            matched: true,
            domain: DOMAINS.CONTRATO,
            action: ACTIONS.CANCELAR_ACAO,
            context: contexto,
            state
        };
    }

    return null;
}

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