export const proximaPergunta = (estado, faltantes) => {
  const mapa = {
    unidadeId: 'a unidade',
    equipamentoId: 'o equipamento',
    tipoManutencao:
      'o tipo da manutencao (Preventiva, Corretiva, Calibracao ou Inspecao)',
    data: 'a data no formato DD/MM/AAAA',
    horaInicio: 'o horario de inicio no formato HH:mm',
    horaFim: 'o horario de termino no formato HH:mm',
    numeroChamado: 'o numero do chamado',
    descricao: 'a descricao do servico',
  };

  return `Para agendar, por favor me informe **${mapa[faltantes[0]]}**.`;
};
