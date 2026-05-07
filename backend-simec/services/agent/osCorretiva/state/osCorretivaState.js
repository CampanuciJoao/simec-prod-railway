export const STEPS_OS = {
  START: 'START',
  SELECIONANDO_ACAO: 'SELECIONANDO_ACAO',
  SELECIONANDO_OS: 'SELECIONANDO_OS',
  COLETANDO_DADOS: 'COLETANDO_DADOS',
  AGUARDANDO_CONFIRMACAO: 'AGUARDANDO_CONFIRMACAO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
};

export function inicializarStepOs(estado = {}) {
  const stepValido = Object.values(STEPS_OS).includes(estado.step) ? estado.step : STEPS_OS.START;
  return { ...estado, step: stepValido };
}

export function mergeEstadoOs(estado, extraido) {
  const novo = { ...estado };

  if (extraido.equipamentoTexto && !novo.equipamentoId) novo.equipamentoTexto = extraido.equipamentoTexto;
  if (extraido.unidadeTexto && !novo.unidadeId) novo.unidadeTexto = extraido.unidadeTexto;
  if (extraido.descricaoProblema) novo.descricaoProblema = extraido.descricaoProblema;
  if (extraido.statusEquipamentoAbertura) novo.statusEquipamentoAbertura = extraido.statusEquipamentoAbertura;
  if (extraido.prestadorNome) novo.prestadorNome = extraido.prestadorNome;
  if (extraido.data) novo.data = extraido.data;
  if (extraido.horaInicio) novo.horaInicio = extraido.horaInicio;
  if (extraido.horaFim) novo.horaFim = extraido.horaFim;

  return novo;
}

export function getFaltantesAbrirOs(estado) {
  const faltantes = [];
  if (!estado.equipamentoId) faltantes.push('equipamentoId');
  if (!estado.descricaoProblema?.trim()) faltantes.push('descricaoProblema');
  if (!estado.statusEquipamentoAbertura) faltantes.push('statusEquipamentoAbertura');
  return faltantes;
}

export function getFaltantesAgendarVisita(estado) {
  const faltantes = [];
  if (!estado.equipamentoId) faltantes.push('equipamentoId');
  if (!estado.osId) faltantes.push('osId');
  if (!estado.prestadorNome?.trim()) faltantes.push('prestadorNome');
  if (!estado.data) faltantes.push('data');
  if (!estado.horaInicio) faltantes.push('horaInicio');
  if (!estado.horaFim) faltantes.push('horaFim');
  return faltantes;
}

export function temDataHora(extraido) {
  return !!(extraido.data || extraido.horaInicio);
}

export function sinalizaNovaOcorrencia(extraido, mensagem) {
  if (extraido.novaOcorrencia === true) return true;
  const m = (mensagem || '').toLowerCase();
  return /nova ocorrência|nova ocorrencia|novo problema|problema diferente|outro defeito|outro problema|abrir nova/.test(m);
}
