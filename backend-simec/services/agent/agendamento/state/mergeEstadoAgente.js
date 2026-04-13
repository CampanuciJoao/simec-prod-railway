export const mergeEstadoAgente = (estado, extraido) => {
  const novo = { ...estado };

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

  return novo;
};