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
    { chave: 'Vidros', valor: seguro.lmiVidros },
    { chave: 'Vendaval', valor: seguro.lmiVendaval },
  ];

  return itens
    .filter((item) => Number(item.valor || 0) > 0)
    .map((item) => ({
      nome: item.chave,
      valor: Number(item.valor || 0),
    }));
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
          acaoSugerida: 'GERAR_PDF',
        }
      : null,
  };
}