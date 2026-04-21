import { obterCamposObrigatoriosManutencao } from '../../../../validators/manutencaoValidator.js';

export const getFaltantes = (estado) => {
  const mapping = {
    equipamentoId: 'equipamentoId',
    tipo: 'tipoManutencao',
    agendamentoDataInicioLocal: 'data',
    agendamentoHoraInicioLocal: 'horaInicio',
    agendamentoDataFimLocal: 'data',
    agendamentoHoraFimLocal: 'horaFim',
    numeroChamado: 'numeroChamado',
    descricaoProblemaServico: 'descricao',
  };

  const obrigatorios = [
    'unidadeId',
    ...obterCamposObrigatoriosManutencao(estado.tipoManutencao).map(
      (campo) => mapping[campo]
    ),
  ].filter(Boolean);

  return [...new Set(obrigatorios)].filter((campo) => !estado[campo]);
};
