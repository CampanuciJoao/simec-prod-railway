export const proximaPergunta = (estado, faltantes) => {
  const mapa = {
    unidadeId: 'a unidade',
    equipamentoId: 'o equipamento',
    tipoManutencao:
      'o tipo da manutenção (Preventiva, Corretiva, Calibração ou Inspeção)',
    data: 'a data',
    horaInicio: 'o horário de início',
    horaFim: 'o horário de término',
    numeroChamado: 'o número do chamado',
    descricao: 'a descrição do serviço',
  };

  return `Para agendar, por favor me informe **${mapa[faltantes[0]]}**.`;
};
