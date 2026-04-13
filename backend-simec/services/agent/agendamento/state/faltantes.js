export const getFaltantes = (estado) => {
  const base = [
    'unidadeId',
    'equipamentoId',
    'tipoManutencao',
    'data',
    'horaInicio',
    'horaFim',
  ];

  const obrigatorios =
    estado.tipoManutencao === 'Corretiva'
      ? [...base, 'numeroChamado', 'descricao']
      : base;

  return obrigatorios.filter((campo) => !estado[campo]);
};