export const mergeEstadoAgente = (estado, extraido) => {
  const novo = { ...estado };
  const unidadeTextoAnterior = estado?.unidadeTexto?.trim() || null;
  const equipamentoTextoAnterior = estado?.equipamentoTexto?.trim() || null;

  const CAMPOS = [
    'tipoManutencao',
    'unidadeTexto',
    'equipamentoTexto',
    'data',
    'horaInicio',
    'horaFim',
    'numeroChamado',
    'descricao',
    'confirmacao',
  ];

  for (const campo of CAMPOS) {
    const valor = extraido[campo];

    if (
      valor !== null &&
      valor !== undefined &&
      !(typeof valor === 'string' && valor.trim() === '')
    ) {
      novo[campo] = valor;
    }
  }

  const unidadeTextoAtual = novo?.unidadeTexto?.trim() || null;
  const equipamentoTextoAtual = novo?.equipamentoTexto?.trim() || null;

  if (
    unidadeTextoAtual &&
    unidadeTextoAnterior &&
    unidadeTextoAtual !== unidadeTextoAnterior
  ) {
    novo.unidadeId = null;
    novo.unidadeNome = null;
    novo.equipamentoId = null;
    novo.equipamentoNome = null;
    novo.modelo = null;
    novo.tag = null;
    novo.tipoEquipamento = null;
    novo.entityResolution = null;
    delete novo.ambiguidadeEquipamento;
  }

  if (
    equipamentoTextoAtual &&
    equipamentoTextoAnterior &&
    equipamentoTextoAtual !== equipamentoTextoAnterior
  ) {
    novo.equipamentoId = null;
    novo.equipamentoNome = null;
    novo.modelo = null;
    novo.tag = null;
    novo.tipoEquipamento = null;

    if (novo.entityResolution?.equipamento) {
      novo.entityResolution.equipamento = null;
    }

    delete novo.ambiguidadeEquipamento;
  }

  return novo;
};
