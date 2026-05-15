function limparTexto(texto = '') {
  return texto
    .replace(/[?.!,;:]+$/g, '')
    .replace(/^de\s+/i, '')
    .replace(/^da\s+/i, '')
    .replace(/^do\s+/i, '')
    .trim();
}

function normalizarTipoManutencao(lower) {
  if (lower.includes('preventiva') || lower.includes('preventivas')) {
    return 'Preventiva';
  }
  if (lower.includes('corretiva') || lower.includes('corretivas')) {
    return 'Corretiva';
  }
  if (lower.includes('calibração') || lower.includes('calibracao')) {
    return 'Calibracao';
  }
  if (lower.includes('inspeção') || lower.includes('inspecao')) {
    return 'Inspecao';
  }
  return null;
}

function extrairPeriodo(lower) {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  // "ano de YYYY" / "no ano de YYYY" / "em YYYY" / "do ano YYYY"
  // Captura ano explicito — evita falso positivo limitando ao range razoavel.
  const matchAno = lower.match(
    /(?:ano\s+de|no\s+ano\s+de|do\s+ano\s+de|do\s+ano|em|no\s+ano)\s+(20\d{2})\b/
  );
  if (matchAno) {
    const ano = parseInt(matchAno[1], 10);
    if (ano >= 2015 && ano <= anoAtual + 1) {
      const inicio = new Date(ano, 0, 1);
      // Se for o ano corrente, fim = hoje; caso contrario, 31/dez do ano
      const fim = ano === anoAtual ? hoje : new Date(ano, 11, 31, 23, 59, 59);
      return { periodoInicio: inicio.toISOString(), periodoFim: fim.toISOString() };
    }
  }

  // "de YYYY até hoje" / "desde YYYY"
  const matchDesdeAno = lower.match(/(?:desde|a\s+partir\s+de|de)\s+(20\d{2})\s*(?:at[eé]\s+hoje|at[eé]\s+agora)?/);
  if (matchDesdeAno) {
    const ano = parseInt(matchDesdeAno[1], 10);
    if (ano >= 2015 && ano <= anoAtual) {
      return {
        periodoInicio: new Date(ano, 0, 1).toISOString(),
        periodoFim: hoje.toISOString(),
      };
    }
  }

  if (lower.includes('último ano') || lower.includes('ultimo ano')) {
    const inicio = new Date(hoje);
    inicio.setFullYear(inicio.getFullYear() - 1);
    return { periodoInicio: inicio.toISOString(), periodoFim: hoje.toISOString() };
  }

  if (lower.includes('últimos 6 meses') || lower.includes('ultimos 6 meses')) {
    const inicio = new Date(hoje);
    inicio.setMonth(inicio.getMonth() - 6);
    return { periodoInicio: inicio.toISOString(), periodoFim: hoje.toISOString() };
  }

  if (lower.includes('últimos 3 meses') || lower.includes('ultimos 3 meses')) {
    const inicio = new Date(hoje);
    inicio.setMonth(inicio.getMonth() - 3);
    return { periodoInicio: inicio.toISOString(), periodoFim: hoje.toISOString() };
  }

  if (
    lower.includes('último mês') ||
    lower.includes('ultimo mes') ||
    lower.includes('últimos 30 dias') ||
    lower.includes('ultimos 30 dias')
  ) {
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 30);
    return { periodoInicio: inicio.toISOString(), periodoFim: hoje.toISOString() };
  }

  return { periodoInicio: null, periodoFim: null };
}

function extrairUnidade(mensagem, lower) {
  if (
    lower.includes('unidade sede') ||
    lower.includes('da sede') ||
    lower.includes('na sede')
  ) {
    return 'sede';
  }

  const padroes = [
    /\b(?:unidade|hospital)\s+de\s+([a-zà-ú0-9\s-]+)\b/i,
    /\bem\s+([a-zà-ú0-9\s-]+)\b/i,
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
  // Captura modalidade + modificador opcional (ex: "RM 3T", "RM 1.5T", "TC
  // 64 cortes", "Mamografia 3D"). O modificador eh tipicamente um valor
  // tecnico que ajuda a desambiguar entre equipamentos da mesma modalidade
  // — sem ele, "rm" sozinho pode bater com varias RMs cadastradas.
  const padraoModalidadeComMod = /\b(tc|ct|rm|rnm|rx|dr|us|uss|tomografia|raio[- ]?x|mam[oó]grafo|mamografia|ultrassom|resson[âa]ncia)\b\s*(\d+(?:[\.,]\d+)?\s*[a-zà-ú]+|\dt|\d+\s*cortes?|3d|2d)/i;
  const matchComMod = mensagem.match(padraoModalidadeComMod);
  if (matchComMod) {
    return limparTexto(`${matchComMod[1]} ${matchComMod[2]}`);
  }

  const matchEquipamento = mensagem.match(
    /\b(tc|ct|rm|rnm|rx|dr|us|uss|tomografia|raio[- ]?x|mam[oó]grafo|mamografia|ultrassom|resson[âa]ncia|act revolution|aquilion ct)\b/i
  );

  if (matchEquipamento?.[1]) {
    return limparTexto(matchEquipamento[1]);
  }

  return null;
}

// Captura 'últimas N' / 'últimos N' / 'top N' / 'os N' como limite de
// quantidade. Default eh null (usa o limite operacional padrao do adapter).
function extrairLimite(lower) {
  const padroes = [
    /(?:[uú]ltim[oa]s|top|primeiros)\s+(\d{1,3})\b/,
    /\b(\d{1,3})\s+(?:[uú]ltim[oa]s|primeiros)\b/,
  ];
  for (const p of padroes) {
    const m = lower.match(p);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (n > 0 && n <= 200) return n;
    }
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
    unidadeTexto: limparTexto(match[2]),
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
    'qual o último',
  ];

  return pistas.some((p) => lower.includes(p));
}

// Pedido explicito de PDF/relatorio para download direto.
// Quando detectado, o agent ja gera e devolve o link sem perguntar
// "deseja gerar PDF?".
function detectarPedidoPdf(lower) {
  const pistas = [
    'pdf',
    'relatorio',
    'relatório',
    'baixar',
    'baixe',
    'baixe-me',
    'me da um relatorio',
    'me de um relatorio',
    'me da o relatorio',
    'me envia',
    'gera um relatorio',
    'gerar relatorio',
    'gerar o relatorio',
    'exportar',
    'exporta',
    'imprimir',
    'imprime',
  ];

  return pistas.some((p) => lower.includes(p));
}

// Detecta se a mensagem eh um pedido de AJUSTE em cima de um relatorio
// anterior (em vez de uma nova consulta do zero). Retorna true quando ha
// indicios curtos como "agora corretivas", "muda pra ultimos 3 meses",
// "do equipamento X em vez disso". Usado para mergir com filtros da sessao.
export function detectarAjusteRelatorio(mensagem) {
  const lower = mensagem.toLowerCase().trim();
  if (lower.length > 100) return false; // ajuste tipicamente eh curto
  const pistas = [
    'agora ',
    'em vez',
    'troca pra',
    'troca para',
    'muda pra',
    'muda para',
    'muda o ',
    'mude pra',
    'mude para',
    'so as ',
    'so os ',
    'apenas ',
    'mostre só',
    'mostre so',
    'no lugar',
  ];
  return pistas.some((p) => lower.includes(p));
}

// Mescla filtros novos sobre os anteriores, preservando o que o usuario
// nao mencionou. Ex: filtros anteriores tinham equipamentoId X + tipo
// preventiva + periodo 12m; novo pedido "agora corretivas" -> mantem
// equipamento e periodo, troca tipo para Corretiva.
export function mesclarFiltrosRelatorio(anteriores = {}, novos = {}) {
  return {
    tipoManutencao: novos.tipoManutencao ?? anteriores.tipoManutencao,
    unidadeTexto: novos.unidadeTexto ?? anteriores.unidadeTexto,
    equipamentoTexto: novos.equipamentoTexto ?? anteriores.equipamentoTexto,
    somenteUltima: novos.somenteUltima ?? anteriores.somenteUltima,
    periodoInicio: novos.periodoInicio ?? anteriores.periodoInicio,
    periodoFim: novos.periodoFim ?? anteriores.periodoFim,
    limite: novos.limite ?? anteriores.limite,
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
    periodoFim: null,
    limite: extrairLimite(lower),
  };

  if ((lower.includes('últimas') || lower.includes('ultimas')) && !lower.includes('quando foi')) {
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