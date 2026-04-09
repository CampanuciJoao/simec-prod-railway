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
        .replace(/^de\s+/i, '')
        .replace(/^da\s+/i, '')
        .replace(/^do\s+/i, '')
        .trim();
}

function normalizarTipoManutencao(lower) {
    if (lower.includes('preventiva') || lower.includes('preventivas')) return 'Preventiva';
    if (lower.includes('corretiva') || lower.includes('corretivas')) return 'Corretiva';
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

    if (lower.includes('últimos 6 meses') || lower.includes('ultimos 6 meses')) {
        const inicio = new Date(hoje);
        inicio.setMonth(inicio.getMonth() - 6);

        return {
            periodoInicio: inicio.toISOString(),
            periodoFim: hoje.toISOString()
        };
    }

    if (lower.includes('últimos 3 meses') || lower.includes('ultimos 3 meses')) {
        const inicio = new Date(hoje);
        inicio.setMonth(inicio.getMonth() - 3);

        return {
            periodoInicio: inicio.toISOString(),
            periodoFim: hoje.toISOString()
        };
    }

    if (
        lower.includes('último mês') ||
        lower.includes('ultimo mes') ||
        lower.includes('últimos 30 dias') ||
        lower.includes('ultimos 30 dias')
    ) {
        const inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - 30);

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

function extrairUnidade(mensagem, lower) {
    if (lower.includes('unidade sede') || lower.includes('da sede') || lower.includes('na sede')) {
        return 'sede';
    }

    const padroes = [
        /\b(?:unidade|hospital)\s+de\s+([a-zà-ú0-9\s-]+)\b/i,
        /\bem\s+([a-zà-ú0-9\s-]+)\b/i
    ];

    for (const padrao of padroes) {
        const match = mensagem.match(padrao);
        if (match?.[1]) {
            const texto = limparTexto(match[1]);

            if (
                texto.length > 1 &&
                !/^tomografia$/i.test(texto) &&
                !/^ressonancia$/i.test(texto) &&
                !/^raio x$/i.test(texto) &&
                !/^ultrassom$/i.test(texto)
            ) {
                return texto;
            }
        }
    }

    return null;
}

function extrairEquipamento(mensagem) {
    const matchEquipamento = mensagem.match(
        /\b(tc|ct|rm|rnm|rx|dr|us|uss|tomografia|raio[- ]?x|mam[oó]grafo|mamografia|ultrassom|resson[âa]ncia|act revolution|aquilion ct)\b/i
    );

    if (matchEquipamento?.[1]) {
        return limparTexto(matchEquipamento[1]);
    }

    return null;
}

function extrairEquipamentoDeUnidade(mensagem) {
    const match = mensagem.match(
        /\b(tc|ct|rm|rnm|rx|dr|us|uss|tomografia|raio[- ]?x|mam[oó]grafo|mamografia|ultrassom|resson[âa]ncia|act revolution|aquilion ct)\s+de\s+([a-zà-ú0-9\s-]+)\b/i
    );

    if (!match) return null;

    return {
        equipamentoTexto: limparTexto(match[1]),
        unidadeTexto: limparTexto(match[2])
    };
}

function detectarSomenteUltima(lower) {
    const pistas = [
        'quando foi',
        'qual foi',
        'última',
        'ultima',
        'mais recente',
        'me diga a ultima',
        'me diga a última',
        'qual a ultima',
        'qual a última',
        'qual o ultimo',
        'qual o último'
    ];

    return pistas.some(p => lower.includes(p));
}

function construirContextoPDFOS(manutencao) {
    if (!manutencao) return null;

    return {
        tipo: 'OS_MANUTENCAO',
        entidade: 'MANUTENCAO',
        idPrincipal: manutencao.id,
        ids: [manutencao.id],
        numeroOS: manutencao.numeroOS || null,
        total: 1,
        acaoSugerida: 'GERAR_PDF_OS'
    };
}

function construirContextoPDFLista(manutencoes) {
    if (!manutencoes || manutencoes.length === 0) return null;

    return {
        tipo: 'RELATORIO_MANUTENCOES',
        entidade: 'MANUTENCAO',
        idPrincipal: null,
        ids: manutencoes.map(m => m.id),
        numeroOS: null,
        total: manutencoes.length,
        acaoSugerida: 'GERAR_PDF_RELATORIO'
    };
}

export function extrairFiltrosRelatorio(mensagem) {
    const lower = mensagem.toLowerCase().trim();

    const filtros = {
        tipoManutencao: normalizarTipoManutencao(lower),
        unidadeTexto: null,
        equipamentoTexto: null,
        somenteUltima: detectarSomenteUltima(lower),
        periodoInicio: null,
        periodoFim: null
    };

    if (
        (lower.includes('últimas') || lower.includes('ultimas')) &&
        !lower.includes('quando foi')
    ) {
        filtros.somenteUltima = false;
    }

    const periodo = extrairPeriodo(lower);
    filtros.periodoInicio = periodo.periodoInicio;
    filtros.periodoFim = periodo.periodoFim;

    const equipDeUnidade = extrairEquipamentoDeUnidade(mensagem);
    if (equipDeUnidade) {
        filtros.equipamentoTexto = equipDeUnidade.equipamentoTexto;
        filtros.unidadeTexto = equipDeUnidade.unidadeTexto;
        return filtros;
    }

    filtros.unidadeTexto = extrairUnidade(mensagem, lower);
    filtros.equipamentoTexto = extrairEquipamento(mensagem);

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
    const dataReferencia =
        manutencao.dataHoraAgendamentoInicio ||
        manutencao.dataConclusao ||
        manutencao.createdAt;

    return `A última ${manutencao.tipo?.toLowerCase()} na unidade ${unidadeNome} foi a OS ${manutencao.numeroOS}, em ${formatarDataHoraBR(dataReferencia)}, no equipamento ${equipamentoNome} (TAG ${tag}), com status ${manutencao.status}.`;
}

export function montarResumoLista(manutencoes, filtros, contexto = {}) {
    if (!manutencoes || manutencoes.length === 0) {
        return 'Não encontrei manutenções correspondentes com os filtros informados.';
    }

    const unidadeNome =
        contexto.unidadeNome ||
        manutencoes[0]?.equipamento?.unidade?.nomeSistema ||
        'N/A';

    const equipamentoNome =
        contexto.equipamentoNome ||
        manutencoes[0]?.equipamento?.modelo ||
        null;

    const tipo = (filtros.tipoManutencao || 'manutenção').toLowerCase();

    if (equipamentoNome) {
        return `Encontrei ${manutencoes.length} registros de ${tipo} para o equipamento ${equipamentoNome}, na unidade ${unidadeNome}.`;
    }

    return `Encontrei ${manutencoes.length} registros de ${tipo} para a unidade ${unidadeNome}.`;
}

export function construirPayloadConsultaUnica(manutencao, respostaTexto) {
    return {
        tipoResposta: 'MANUTENCAO_UNICA',
        respostaTexto,
        manutencaoId: manutencao?.id || null,
        numeroOS: manutencao?.numeroOS || null,
        total: manutencao ? 1 : 0,
        contextoPDF: construirContextoPDFOS(manutencao)
    };
}

export function construirPayloadLista(manutencoes, filtros, respostaTexto) {
    return {
        tipoResposta: 'LISTA_MANUTENCOES',
        respostaTexto,
        total: manutencoes?.length || 0,
        ids: manutencoes?.map(m => m.id) || [],
        contextoPDF: construirContextoPDFLista(manutencoes)
    };
}