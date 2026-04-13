function formatarDataHoraBR(data) {
  if (!data) return 'N/A';
  return new Date(data).toLocaleString('pt-BR');
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