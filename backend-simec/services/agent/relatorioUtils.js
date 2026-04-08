// simec/backend-simec/services/agent/relatorioUtils.js

function formatarDataBR(data) {
    if (!data) return 'N/A';
    return new Date(data).toLocaleDateString('pt-BR');
}

function formatarDataHoraBR(data) {
    if (!data) return 'N/A';
    return new Date(data).toLocaleString('pt-BR');
}

function limparTexto(texto = '') {
    return texto
        .replace(/[?.!,;:]+$/g, '')
        .trim();
}

function normalizarTipoManutencao(lower) {
    if (lower.includes('preventiva')) return 'Preventiva';
    if (lower.includes('corretiva')) return 'Corretiva';
    if (lower.includes('calibração') || lower.includes('calibracao')) return 'Calibracao';
    if (lower.includes('inspeção') || lower.includes('inspecao')) return 'Inspecao';
    return null;
}

function extrairPeriodo(lower) {
    const hoje = new Date();

    if (lower.includes('último ano') || lower.includes('ultimo ano')) {
        const inicio = new Date(hoje);
        inicio.setFullYear(inicio.getFullYear() - 1);

        return {
            periodoInicio: inicio.toISOString(),
            periodoFim: hoje.toISOString()
        };
    }

    return {
        periodoInicio: null,
        periodoFim: null
    };
}

export function extrairFiltrosRelatorio(mensagem) {
    const lower = mensagem.toLowerCase().trim();

    const filtros = {
        tipoManutencao: normalizarTipoManutencao(lower),
        unidadeTexto: null,
        equipamentoTexto: null,
        somenteUltima: false,
        periodoInicio: null,
        periodoFim: null
    };

    // Última / mais recente
    if (
        lower.includes('última') ||
        lower.includes('ultima') ||
        lower.includes('mais recente') ||
        lower.includes('quando foi')
    ) {
        filtros.somenteUltima = true;
    }

    // Período
    const periodo = extrairPeriodo(lower);
    filtros.periodoInicio = periodo.periodoInicio;
    filtros.periodoFim = periodo.periodoFim;

    // 1. Padrão mais importante:
    // "tomografia de coxim", "ultrassom de dourados", etc.
    const matchEquipDeUnidade = mensagem.match(
        /\b(tomografia|raio[- ]?x|mam[oó]grafo|ultrassom|resson[âa]ncia|act revolution|aquilion ct)\s+de\s+([a-zà-ú0-9\s-]+)\b/i
    );

    if (matchEquipDeUnidade) {
        filtros.equipamentoTexto = limparTexto(matchEquipDeUnidade[1]);
        filtros.unidadeTexto = limparTexto(matchEquipDeUnidade[2]);
        return filtros;
    }

    // 2. "na tomografia de coxim"
    const matchNaEquipDeUnidade = mensagem.match(
        /\bna?\s+(tomografia|raio[- ]?x|mam[oó]grafo|ultrassom|resson[âa]ncia|act revolution|aquilion ct)\s+de\s+([a-zà-ú0-9\s-]+)\b/i
    );

    if (matchNaEquipDeUnidade) {
        filtros.equipamentoTexto = limparTexto(matchNaEquipDeUnidade[1]);
        filtros.unidadeTexto = limparTexto(matchNaEquipDeUnidade[2]);
        return filtros;
    }

    // 3. Unidade explícita: "unidade de coxim"
    const matchUnidade = mensagem.match(
        /\b(?:unidade|hospital)\s+de\s+([a-zà-ú0-9\s-]+)\b/i
    );

    if (matchUnidade) {
        filtros.unidadeTexto = limparTexto(matchUnidade[1]);
    }

    // 4. Equipamento explícito
    const matchEquipamento = mensagem.match(
        /\b(tomografia|raio[- ]?x|mam[oó]grafo|ultrassom|resson[âa]ncia|act revolution|aquilion ct)\b/i
    );

    if (matchEquipamento) {
        filtros.equipamentoTexto = limparTexto(matchEquipamento[1]);
    }

    return filtros;
}

export function montarResumoUltima(manutencao, filtros, contexto = {}) {
    if (!manutencao) {
        return 'Não encontrei manutenção correspondente com os filtros informados.';
    }

    const unidadeNome =
        manutencao?.equipamento?.unidade?.nomeSistema ||
        contexto.unidadeNome ||
        'N/A';

    const equipamentoNome =
        manutencao?.equipamento?.modelo ||
        contexto.equipamentoNome ||
        'N/A';

    const tag = manutencao?.equipamento?.tag || 'N/A';

    return `A última ${manutencao.tipo?.toLowerCase()} na unidade ${unidadeNome} foi a OS ${manutencao.numeroOS}, em ${formatarDataHoraBR(manutencao.dataHoraAgendamentoInicio || manutencao.dataConclusao)}, no equipamento ${equipamentoNome} (TAG ${tag}), com status ${manutencao.status}.`;
}

export function montarResumoLista(manutencoes, filtros, contexto = {}) {
    if (!manutencoes || manutencoes.length === 0) {
        return 'Não encontrei manutenções correspondentes com os filtros informados.';
    }

    const unidadeNome =
        contexto.unidadeNome ||
        manutencoes[0]?.equipamento?.unidade?.nomeSistema ||
        'N/A';

    const tipo = (filtros.tipoManutencao || 'manutenção').toLowerCase();

    return `Encontrei ${manutencoes.length} registros de ${tipo} para a unidade ${unidadeNome}.`;
}

export function construirPayloadConsultaUnica(manutencao, respostaTexto) {
    return {
        tipoResposta: 'MANUTENCAO_UNICA',
        respostaTexto,
        manutencaoId: manutencao?.id || null,
        numeroOS: manutencao?.numeroOS || null,
        total: manutencao ? 1 : 0,
        contextoPDF: manutencao
            ? {
                  tipo: 'OS_MANUTENCAO',
                  manutencaoId: manutencao.id
              }
            : null
    };
}

export function construirPayloadLista(manutencoes, filtros, respostaTexto) {
    return {
        tipoResposta: 'LISTA_MANUTENCOES',
        respostaTexto,
        total: manutencoes?.length || 0,
        ids: manutencoes?.map(m => m.id) || [],
        contextoPDF: manutencoes?.length
            ? {
                  tipo: 'RELATORIO_MANUTENCOES',
                  ids: manutencoes.map(m => m.id)
              }
            : null
    };
}