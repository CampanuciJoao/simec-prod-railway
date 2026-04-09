// simec/backend-simec/services/agent/seguroUtils.js

function formatarDataBR(data) {
    if (!data) return 'N/A';
    return new Date(data).toLocaleDateString('pt-BR');
}

function limparTexto(texto = '') {
    return texto
        .replace(/[?.!,;:]+$/g, '')
        .replace(/^de\s+/i, '')
        .replace(/^da\s+/i, '')
        .replace(/^do\s+/i, '')
        .replace(/^na\s+/i, '')
        .replace(/^no\s+/i, '')
        .trim();
}

function isPalavraEquipamento(texto = '') {
    return /^(tc|ct|rm|rnm|rx|dr|us|uss|tomografia|raio[- ]?x|mam[oó]grafo|mamografia|ultrassom|resson[âa]ncia|act revolution|aquilion ct)$/i.test(texto);
}

function extrairUnidade(mensagem, lower) {
    if (
        lower.includes('unidade sede') ||
        lower.includes('da sede') ||
        lower.includes('na sede') ||
        lower === 'sede' ||
        lower === 'apolice da sede' ||
        lower === 'apólice da sede' ||
        lower === 'seguro da sede'
    ) {
        return 'sede';
    }

    const padroes = [
        /\b(?:unidade|hospital)\s+de\s+([a-zà-ú0-9\s-]+)\b/i,
        /\b(?:apólice|apolice|seguro)\s+da\s+unidade\s+([a-zà-ú0-9\s-]+)\b/i,
        /\b(?:apólice|apolice|seguro)\s+de\s+([a-zà-ú0-9\s-]+)\b/i,
        /\b(?:apólice|apolice|seguro)\s+da\s+([a-zà-ú0-9\s-]+)\b/i,
        /\bem\s+([a-zà-ú0-9\s-]+)\b/i
    ];

    for (const padrao of padroes) {
        const match = mensagem.match(padrao);
        if (match?.[1]) {
            const texto = limparTexto(match[1]);

            if (texto.length > 1 && !isPalavraEquipamento(texto)) {
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

function detectarPedidoVigente(lower) {
    return (
        lower.includes('vigente') ||
        lower.includes('ativo') ||
        lower.includes('atual') ||
        lower.includes('em vigor')
    );
}

function detectarPedidoMaisRecente(lower) {
    return (
        lower.includes('último') ||
        lower.includes('ultima') ||
        lower.includes('última') ||
        lower.includes('mais recente') ||
        lower.includes('mais atual')
    );
}

function montarCoberturasDetalhadas(seguro) {
    if (!seguro) return [];

    const itens = [
        { chave: 'APP', valor: seguro.lmiAPP },
        { chave: 'Danos Corporais', valor: seguro.lmiDanosCorporais },
        { chave: 'Danos Elétricos', valor: seguro.lmiDanosEletricos },
        { chave: 'Danos Materiais', valor: seguro.lmiDanosMateriais },
        { chave: 'Danos Morais', valor: seguro.lmiDanosMorais },
        { chave: 'Incêndio', valor: seguro.lmiIncendio },
        { chave: 'Responsabilidade Civil', valor: seguro.lmiResponsabilidadeCivil },
        { chave: 'Roubo / Furto', valor: seguro.lmiRoubo },
        { chave: 'Vidros', valor: seguro.lmiVidros }
    ];

    return itens
        .filter(item => Number(item.valor || 0) > 0)
        .map(item => ({
            nome: item.chave,
            valor: Number(item.valor || 0)
        }));
}

export function extrairFiltrosSeguro(mensagem) {
    const lower = mensagem.toLowerCase().trim();

    const filtros = {
        unidadeTexto: null,
        equipamentoTexto: null,
        somenteVigente: detectarPedidoVigente(lower),
        somenteMaisRecente: detectarPedidoMaisRecente(lower),
        pedirCobertura: false,
        pedirVencimento: false,
        pedirDocumento: false
    };

    if (
        lower.includes('cobertura') ||
        lower.includes('coberturas') ||
        lower.includes('o que cobre') ||
        lower.includes('me mostre a cobertura') ||
        lower.includes('mostrar cobertura') ||
        lower.includes('quais as coberturas') ||
        lower.includes('quais coberturas')
    ) {
        filtros.pedirCobertura = true;
    }

    if (
        lower.includes('vencimento') ||
        lower.includes('vence') ||
        lower.includes('validade') ||
        lower.includes('vigência') ||
        lower.includes('vigencia') ||
        lower.includes('quando vence')
    ) {
        filtros.pedirVencimento = true;
    }

    if (
        lower.includes('pdf') ||
        lower.includes('apólice') ||
        lower.includes('apolice') ||
        lower.includes('documento') ||
        lower.includes('arquivo') ||
        lower.includes('anexo') ||
        lower.includes('abrir o pdf') ||
        lower.includes('abrir pdf') ||
        lower.includes('abrir documento') ||
        lower.includes('preciso da apolice') ||
        lower.includes('preciso da apólice') ||
        lower.includes('quero a apolice') ||
        lower.includes('quero a apólice') ||
        lower.includes('me traga o pdf') ||
        lower.includes('me traz o pdf')
    ) {
        filtros.pedirDocumento = true;
    }

    const equipDeUnidade = extrairEquipamentoDeUnidade(mensagem);
    if (equipDeUnidade) {
        filtros.equipamentoTexto = equipDeUnidade.equipamentoTexto;
        filtros.unidadeTexto = equipDeUnidade.unidadeTexto;
    } else {
        filtros.unidadeTexto = extrairUnidade(mensagem, lower);
        filtros.equipamentoTexto = extrairEquipamento(mensagem);
    }

    if (!filtros.unidadeTexto) {
        const matchCurto = mensagem.match(/^\s*de\s+([a-zà-ú0-9\s-]+)\s*$/i);
        if (matchCurto?.[1]) {
            const texto = limparTexto(matchCurto[1]);
            if (texto.length > 1 && !isPalavraEquipamento(texto)) {
                filtros.unidadeTexto = texto;
            }
        }
    }

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

    const coberturasDetalhadas = montarCoberturasDetalhadas(seguro);

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
        premioTotal: seguro?.premioTotal ?? 0,
        coberturasDetalhadas,
        temAnexo,
        contextoPDF: temAnexo
            ? {
                  tipo: 'SEGURO_DOCUMENTO',
                  entidade: 'SEGURO',
                  idPrincipal: seguro.id,
                  seguroId: seguro.id,
                  anexoId: seguro.anexos[0].id,
                  numeroApolice: seguro.apoliceNumero || null,
                  total: 1,
                  acaoSugerida: 'GERAR_PDF'
              }
            : null
    };
}