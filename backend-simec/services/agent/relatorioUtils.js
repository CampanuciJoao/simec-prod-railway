// simec/backend-simec/services/agent/relatorioUtils.js

export function formatarDataBR(data) {
    if (!data) return 'N/A';
    return new Date(data).toLocaleString('pt-BR');
}

export function inicioDoDia(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function fimDoDia(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function extrairFiltrosRelatorio(mensagem) {
    const lower = mensagem.toLowerCase().trim();
    const hoje = new Date();

    const filtros = {
        tipoManutencao: null,
        unidadeTexto: null,
        equipamentoTexto: null,
        periodoInicio: null,
        periodoFim: null,
        somenteUltima: false
    };

    // Tipo de manutenção
    if (lower.includes('preventiva')) filtros.tipoManutencao = 'Preventiva';
    if (lower.includes('corretiva')) filtros.tipoManutencao = 'Corretiva';

    // Última / mais recente
    if (lower.includes('última') || lower.includes('ultima') || lower.includes('mais recente')) {
        filtros.somenteUltima = true;
    }

    // Unidade
    const matchUnidade = mensagem.match(/(?:unidade|hospital)\s+(?:de\s+)?([a-zà-ú0-9\s-]+)/i);
    if (matchUnidade) {
        filtros.unidadeTexto = matchUnidade[1].trim();
    }

    // Equipamento por pistas comuns
    const matchEquip = mensagem.match(
        /(?:equipamento|tomografia|raio[- ]?x|mam[oó]grafo|ultrassom|resson[âa]ncia|act revolution|aquilion ct)(?:\s+de\s+[a-zà-ú0-9\s-]+)?/i
    );

    if (matchEquip) {
        let eq = matchEquip[0].trim();
        eq = eq.replace(/^(equipamento)\s+/i, '').trim();
        eq = eq.replace(/\s+da?\s+unidade\s+de\s+[a-zà-ú0-9\s-]+$/i, '').trim();
        eq = eq.replace(/\s+de\s+[a-zà-ú0-9\s-]+$/i, '').trim();

        if (!/^unidade$/i.test(eq)) {
            filtros.equipamentoTexto = eq;
        }
    }

    // Período: último ano
    if (
        lower.includes('último ano') ||
        lower.includes('ultimo ano') ||
        lower.includes('1 ano') ||
        lower.includes('um ano')
    ) {
        const fim = fimDoDia(hoje);
        const inicio = inicioDoDia(
            new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate())
        );

        filtros.periodoInicio = inicio.toISOString();
        filtros.periodoFim = fim.toISOString();
    }

    // Período: últimos 30 dias
    if (lower.includes('últimos 30 dias') || lower.includes('ultimos 30 dias')) {
        const fim = fimDoDia(hoje);
        const inicio = inicioDoDia(new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000));

        filtros.periodoInicio = inicio.toISOString();
        filtros.periodoFim = fim.toISOString();
    }

    // Período: últimos 6 meses
    if (lower.includes('últimos 6 meses') || lower.includes('ultimos 6 meses')) {
        const fim = fimDoDia(hoje);
        const inicio = inicioDoDia(
            new Date(hoje.getFullYear(), hoje.getMonth() - 6, hoje.getDate())
        );

        filtros.periodoInicio = inicio.toISOString();
        filtros.periodoFim = fim.toISOString();
    }

    return filtros;
}

export function montarResumoUltima(item, filtros, contexto) {
    const unidadeNome = contexto.unidadeNome || filtros.unidadeTexto || 'unidade informada';
    const equipamentoNome = contexto.equipamentoNome || filtros.equipamentoTexto || null;
    const tipo = filtros.tipoManutencao || 'manutenção';

    if (!item) {
        if (equipamentoNome) {
            return `Não encontrei ${tipo.toLowerCase()} para o equipamento ${equipamentoNome}.`;
        }

        return `Não encontrei ${tipo.toLowerCase()} na unidade ${unidadeNome}.`;
    }

    const alvo = equipamentoNome
        ? `no equipamento ${equipamentoNome}`
        : `na unidade ${unidadeNome}`;

    return `A última ${tipo.toLowerCase()} ${alvo} foi a OS ${item.numeroOS}, em ${formatarDataBR(item.dataHoraAgendamentoInicio)}, no equipamento ${item.equipamento?.modelo || 'N/A'} (TAG ${item.equipamento?.tag || 'N/A'}), com status ${item.status}.`;
}

export function montarResumoLista(dados, filtros, contexto) {
    const total = dados.length;
    const unidadeNome = contexto.unidadeNome || filtros.unidadeTexto || 'unidade informada';
    const equipamentoNome = contexto.equipamentoNome || filtros.equipamentoTexto || null;
    const tipo = filtros.tipoManutencao || 'manutenções';

    const periodoTxt =
        filtros.periodoInicio && filtros.periodoFim
            ? ` entre ${new Date(filtros.periodoInicio).toLocaleDateString('pt-BR')} e ${new Date(filtros.periodoFim).toLocaleDateString('pt-BR')}`
            : '';

    if (total === 0) {
        if (equipamentoNome) {
            return `Não encontrei ${tipo.toLowerCase()}${periodoTxt} para o equipamento ${equipamentoNome}.`;
        }

        return `Não encontrei ${tipo.toLowerCase()}${periodoTxt} na unidade ${unidadeNome}.`;
    }

    const maisRecente = dados[0];
    const alvo = equipamentoNome
        ? `no equipamento ${equipamentoNome}`
        : `na unidade ${unidadeNome}`;

    return `Encontrei ${total} ${tipo.toLowerCase()}${periodoTxt} ${alvo}. A mais recente foi a OS ${maisRecente.numeroOS}, em ${formatarDataBR(maisRecente.dataHoraAgendamentoInicio)}, no equipamento ${maisRecente.equipamento?.modelo || 'N/A'} (TAG ${maisRecente.equipamento?.tag || 'N/A'}).`;
}

export function construirPayloadConsultaUnica(manutencao, respostaTexto) {
    return {
        tipoResposta: 'MANUTENCAO_UNICA',
        total: manutencao ? 1 : 0,
        respostaTexto,
        podeGerarPDF: !!manutencao,
        podeGerarOSIndividual: !!manutencao,
        manutencaoId: manutencao?.id || null,
        numeroOS: manutencao?.numeroOS || null,
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
        total: manutencoes.length,
        respostaTexto,
        podeGerarPDF: manutencoes.length > 0,
        podeGerarOSIndividual: manutencoes.length === 1,
        manutencaoId: manutencoes.length === 1 ? manutencoes[0].id : null,
        numeroOS: manutencoes.length === 1 ? manutencoes[0].numeroOS : null,
        filtrosAplicados: filtros,
        ids: manutencoes.map(m => m.id),
        contextoPDF:
            manutencoes.length === 1
                ? {
                      tipo: 'OS_MANUTENCAO',
                      manutencaoId: manutencoes[0].id
                  }
                : manutencoes.length > 0
                  ? {
                        tipo: 'RELATORIO_MANUTENCOES',
                        ids: manutencoes.map(m => m.id),
                        filtros
                    }
                  : null
    };
}