import {
  MANUTENCAO_FIELD_LABELS,
  validarManutencaoPayload,
} from '../../../validators/manutencaoValidator.js';

function normalizarTipoManutencao(tipoManutencao) {
  const tipo = (tipoManutencao || '').toString().trim().toLowerCase();

  if (tipo === 'preventiva') return 'Preventiva';
  if (tipo === 'corretiva') return 'Corretiva';
  if (tipo === 'calibracao' || tipo === 'calibração') return 'Calibracao';
  if (tipo === 'inspecao' || tipo === 'inspeção') return 'Inspecao';

  return null;
}

function montarDescricaoFinal(tipoManutencao, estado) {
  if (estado?.descricaoProblemaServico?.trim()) {
    return estado.descricaoProblemaServico.trim();
  }

  if (estado?.descricao?.trim()) {
    return estado.descricao.trim();
  }

  if (tipoManutencao === 'Corretiva') {
    return '';
  }

  return 'Manutenção preventiva de rotina';
}

export function montarPayloadManutencaoDoAgente(estado) {
  const tipo = normalizarTipoManutencao(estado?.tipoManutencao);

  return {
    equipamentoId: estado?.equipamentoId || '',
    tipo: tipo || '',
    descricaoProblemaServico: montarDescricaoFinal(tipo, estado),
    tecnicoResponsavel: estado?.tecnicoResponsavel?.trim() || null,
    numeroChamado: estado?.numeroChamado?.trim() || null,
    agendamentoDataInicioLocal: estado?.data || '',
    agendamentoHoraInicioLocal: estado?.horaInicio || '',
    agendamentoDataFimLocal: estado?.data || '',
    agendamentoHoraFimLocal: estado?.horaFim || '',
    status: 'Agendada',
    origemAbertura: 'agente',
  };
}

export function validarPayloadAgendamentoDoAgente(estado) {
  const payload = montarPayloadManutencaoDoAgente(estado);
  const validacao = validarManutencaoPayload(payload);

  return {
    payload,
    validacao,
    labels: MANUTENCAO_FIELD_LABELS,
  };
}

/**
 * Monta uma RECOMENDAÇÃO de manutenção (sem persistir no banco).
 * O agente nunca cria OS por conta própria — apenas valida o payload e
 * devolve para o front, que abre o modal de agendamento pré-preenchido
 * para o usuário confirmar manualmente.
 */
export function montarRecomendacaoManutencao(estado) {
  const { payload, validacao } = validarPayloadAgendamentoDoAgente(estado);

  if (!validacao.ok) {
    const error = new Error(validacao.message || 'Dados inválidos para recomendar a manutenção.');
    error.code = 'AGENT_VALIDATION_ERROR';
    error.details = validacao;
    throw error;
  }

  return {
    tipo: 'agendamento_manutencao',
    payload,
    contexto: {
      equipamentoId: estado?.equipamentoId || null,
      equipamentoModelo: estado?.modelo || estado?.equipamentoNome || null,
      equipamentoTag: estado?.tag || null,
      unidadeId: estado?.unidadeId || null,
      unidadeNome: estado?.unidadeNome || null,
    },
  };
}
