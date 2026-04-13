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

function construirContextoPDFLista(manutencoes) {
  if (!manutencoes || manutencoes.length === 0) return null;

  return {
    tipo: 'RELATORIO_MANUTENCOES',
    entidade: 'MANUTENCAO',
    idPrincipal: null,
    ids: manutencoes.map((m) => m.id),
    numeroOS: null,
    total: manutencoes.length,
    acaoSugerida: 'GERAR_PDF_RELATORIO',
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
  };
}

export function construirPayloadLista(manutencoes, filtros, respostaTexto) {
  return {
    tipoResposta: 'LISTA_MANUTENCOES',
    respostaTexto,
    total: manutencoes?.length || 0,
    ids: manutencoes?.map((m) => m.id) || [],
    contextoPDF: construirContextoPDFLista(manutencoes),
  };
}