// simec/backend-simec/services/agent/stateMachine.js

export const STEPS = {
  START: 'START',
  COLETANDO_DADOS: 'COLETANDO_DADOS',
  AGUARDANDO_CONFIRMACAO: 'AGUARDANDO_CONFIRMACAO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
};

/**
 * Garante que todo estado tenha um step válido.
 */
export function inicializarStep(estado = {}) {
  const stepValido = Object.values(STEPS).includes(estado.step)
    ? estado.step
    : STEPS.START;

  return {
    ...estado,
    step: stepValido,
  };
}

/**
 * Decide o próximo step com base no estado atual e no contexto.
 */
export function determinarProximoStep({
  estado,
  faltantes = [],
  conflitoAgenda = null,
  confirmacao = null,
  houveCorrecao = false,
}) {
  if (confirmacao === false && !houveCorrecao) {
    return STEPS.CANCELADO;
  }

  if (faltantes.length > 0) {
    return STEPS.COLETANDO_DADOS;
  }

  if (conflitoAgenda && !conflitoAgenda.valido) {
    return STEPS.COLETANDO_DADOS;
  }

  if (estado.step === STEPS.AGUARDANDO_CONFIRMACAO && confirmacao === true) {
    return STEPS.FINALIZADO;
  }

  return STEPS.AGUARDANDO_CONFIRMACAO;
}

/**
 * Reseta o fluxo de confirmação quando o usuário altera algo.
 */
export function resetarConfirmacaoSeHouverMudanca(estado, houveMudanca) {
  if (!houveMudanca) return estado;

  return {
    ...estado,
    aguardandoConfirmacao: false,
    confirmacao: null,
    step: STEPS.COLETANDO_DADOS,
  };
}