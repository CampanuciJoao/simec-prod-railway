// simec/backend-simec/services/agent/seguroUtils.js

function formatarDataBR(data) {
    if (!data) return 'N/A';
    return new Date(data).toLocaleDateString('pt-BR');
}

function limparTextoFinal(texto = '') {
    return texto
        .replace(/\?+$/, '')
        .replace(/\.+$/, '')
        .replace(/,+$/, '')
        .trim();
}

export function extrairFiltrosSeguro(mensagem) {
    const lower = mensagem.toLowerCase().trim();

    const filtros = {
        unidadeTexto: null,
        equipamentoTexto: null,
        somenteVigente: false,
        somenteMaisRecente: false,
        pedirCobertura: false,
        pedirVencimento: false,
        pedirDocumento: false
    };

    if (
        lower.includes('vigente') ||
        lower.includes('ativo') ||
        lower.includes('atual') ||
        lower.includes('em vigor')
    ) {
        filtros.somenteVigente = true;
    }

    if (
        lower.includes('último') ||
        lower.includes('ultima') ||
        lower.includes('última') ||
        lower.includes('mais recente')
    ) {
        filtros.somenteMaisRecente = true;
    }

    if (
        lower.includes('cobertura') ||
        lower.includes('coberturas') ||
        lower.includes('o que cobre')
    ) {
        filtros.pedirCobertura = true;
    }

    if (
        lower.includes('vencimento') ||
        lower.includes('vence') ||
        lower.includes('validade') ||
        lower.includes('vigência') ||
        lower.includes('vigencia')
    ) {
        filtros.pedirVencimento = true;
    }

    if (
        lower.includes('pdf') ||
        lower.includes('apólice') ||
        lower.includes('apolice') ||
        lower.includes('documento') ||
        lower.includes('arquivo') ||
        lower.includes('anexo')
    ) {
        filtros.pedirDocumento = true;
    }

    // Casos explícitos de sede
    if (
        lower.includes('unidade sede') ||
        lower.includes('da sede') ||
        lower.includes('na sede') ||
        lower === 'sede'
    ) {
        filtros.unidadeTexto = 'sede';
    }

    // Unidade / hospital
    if (!filtros.unidadeTexto) {
        const matchUnidade = mensagem.match(
            /(?:unidade|hospital)\s+(?:de\s+)?([a-zà-ú0-9\s-]+)/i
        );

        if (matchUnidade) {
            filtros.unidadeTexto = limparTextoFinal(matchUnidade[1]);
        }
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
        filtros.equipamentoTexto = limparTextoFinal(eq);
    }

    // Se não pediu explicitamente vigente nem mais recente, por padrão preferimos o mais recente
    if (!filtros.somenteVigente && !filtros.somenteMaisRecente) {
        filtros.somenteMaisRecente = true;
    }

    return filtros;
}

export function montarResumoSeguro(seguro, contexto) {
    if (!seguro) {
        return 'Não encontrei um seguro correspondente com os filtros informados.';
    }

    const alvo = seguro.equipamento
        ? `equipamento ${seguro.equipamento.modelo} (TAG ${seguro.equipamento.tag || 'N/A'})`
        : seguro.unidade
          ? `unidade ${seguro.unidade.nomeSistema}`
          : 'objeto segurado';

    const statusTexto = seguro.status ? ` Status atual: ${seguro.status}.` : '';

    return `Encontrei a apólice ${seguro.apoliceNumero} da seguradora ${seguro.seguradora}, vinculada ao ${alvo}. A vigência vai de ${formatarDataBR(seguro.dataInicio)} até ${formatarDataBR(seguro.dataFim)}.${statusTexto}`;
}

export function construirPayloadSeguro(seguro, respostaTexto) {
    const temAnexo = (seguro?.anexos?.length || 0) > 0;
    const tipoVinculo = seguro?.equipamento
        ? 'EQUIPAMENTO'
        : seguro?.unidade
          ? 'UNIDADE'
          : 'GERAL';

    return {
        tipoResposta: 'SEGURO_UNICO',
        respostaTexto,
        seguroId: seguro?.id || null,
        unidadeId: seguro?.unidade?.id || null,
        unidadeNome: seguro?.unidade?.nomeSistema || null,
        equipamentoId: seguro?.equipamento?.id || null,
        equipamentoNome: seguro?.equipamento?.modelo || null,
        equipamentoTag: seguro?.equipamento?.tag || null,
        tipoVinculo,
        numeroApolice: seguro?.apoliceNumero || null,
        seguradora: seguro?.seguradora || null,
        status: seguro?.status || null,
        dataInicio: seguro?.dataInicio || null,
        vencimento: seguro?.dataFim || null,
        cobertura: seguro?.cobertura || null,
        temAnexo,
        contextoPDF: temAnexo
            ? {
                  tipo: 'SEGURO_DOCUMENTO',
                  seguroId: seguro.id,
                  anexoId: seguro.anexos[0].id
              }
            : null
    };
}