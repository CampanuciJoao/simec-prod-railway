function construirContextoPDFOS(manutencao) {
  if (!manutencao) return null;

  return {
    tipo: 'OS_MANUTENCAO',
    entidade: 'MANUTENCAO',
    idPrincipal: manutencao.id,
    ids: [manutencao.id],
    numeroOS: manutencao.numeroOS || null,
    total: 1,
    acaoSugerida: 'GERAR_PDF_OS',
  };
}

function construirContextoPDFLista(items) {
  if (!items || items.length === 0) return null;

  return {
    tipo: 'RELATORIO_MANUTENCOES',
    entidade: 'MANUTENCAO',
    idPrincipal: null,
    ids: items.map((m) => m.id),
    numeroOS: null,
    total: items.length,
    acaoSugerida: 'GERAR_PDF_RELATORIO',
  };
}

function fmtData(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

// Monta um payload de PREVIEW para o card no chat. Usuario ve a tabela
// resumida + filtros aplicados + resumo, e clica em download para gerar
// o PDF (PDF nao eh gerado ate o clique — economiza recursos).
//
// preview = {
//   titulo, filtros[], resumo{}, colunas[], linhas[][]
// }
export function construirPreviewLista(resultadoBusca, contexto, filtros) {
  const items = resultadoBusca?.items || [];
  if (items.length === 0) return null;

  const tipoLabel = filtros.tipoManutencao
    ? filtros.tipoManutencao.toLowerCase()
    : 'manutenção';

  const filtrosVisiveis = [];
  if (contexto?.equipamentoNome || contexto?.modelo) {
    filtrosVisiveis.push({
      label: 'Equipamento',
      value: contexto.equipamentoNome || contexto.modelo,
    });
  }
  if (contexto?.unidadeNome) {
    filtrosVisiveis.push({ label: 'Unidade', value: contexto.unidadeNome });
  }
  filtrosVisiveis.push({ label: 'Tipo', value: filtros.tipoManutencao || 'Todas' });
  if (resultadoBusca.periodoUsado) {
    filtrosVisiveis.push({ label: 'Período', value: resultadoBusca.periodoUsado });
  } else {
    filtrosVisiveis.push({
      label: 'Período',
      value: `${fmtData(resultadoBusca.periodoInicio)} a ${fmtData(resultadoBusca.periodoFim)}`,
    });
  }

  const resumo = {
    totalIncluido: items.length,
    totalEncontrado: resultadoBusca.totalEncontrado,
    limitado: resultadoBusca.limitado,
    avisoLimite: resultadoBusca.limitado
      ? `Encontrados ${resultadoBusca.totalEncontrado} registros — incluí os ${items.length} mais recentes. Para ver mais, peça um período menor (ex: "últimos 6 meses").`
      : null,
    avisoPeriodoCapado: resultadoBusca.periodoCapado
      ? `Período pedido excedia o máximo (36 meses). Use filtros mais estreitos para um recorte específico.`
      : null,
  };

  return {
    tipo: 'PREVIEW_RELATORIO_MANUTENCOES',
    titulo: `Relatório de ${tipoLabel === 'manutenção' ? 'manutenções' : tipoLabel + 's'}`,
    filtros: filtrosVisiveis,
    resumo,
    colunas: ['Nº OS', 'Data', 'Equipamento', 'Responsável'],
    linhas: items.slice(0, 10).map((m) => [
      m.numeroOS || '—',
      fmtData(m.dataConclusao),
      `${m.equipamento?.modelo || '—'}${m.equipamento?.tag ? ` (${m.equipamento.tag})` : ''}`,
      m.tecnicoResponsavel || '—',
    ]),
    totalLinhasPreview: items.length > 10
      ? `Mostrando 10 de ${items.length} linhas — o PDF inclui todas.`
      : null,
  };
}

export function construirPayloadConsultaUnica(manutencao, respostaTexto) {
  return {
    tipoResposta: 'MANUTENCAO_UNICA',
    respostaTexto,
    manutencaoId: manutencao?.id || null,
    numeroOS: manutencao?.numeroOS || null,
    total: manutencao ? 1 : 0,
    contextoPDF: construirContextoPDFOS(manutencao),
    // Link direto pra ficha da manutencao no chat
    linkManutencao: manutencao?.id ? `/manutencoes/detalhes/${manutencao.id}` : null,
  };
}

export function construirPayloadLista(resultadoBusca, filtros, respostaTexto, contexto = {}) {
  const items = resultadoBusca?.items || [];
  return {
    tipoResposta: 'LISTA_MANUTENCOES',
    respostaTexto,
    total: items.length,
    totalEncontrado: resultadoBusca?.totalEncontrado || items.length,
    limitado: !!resultadoBusca?.limitado,
    ids: items.map((m) => m.id),
    contextoPDF: construirContextoPDFLista(items),
    preview: construirPreviewLista(resultadoBusca, contexto, filtros),
    // Filtros aplicados sao persistidos para que pedidos de AJUSTE em
    // turnos seguintes ('agora corretivas', 'ultimos 6 meses', etc)
    // possam mergir sem recomecar do zero.
    filtrosAplicados: filtros,
  };
}
