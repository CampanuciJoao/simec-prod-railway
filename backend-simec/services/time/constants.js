// Ficheiro: backend-simec/services/time/constants.js

export const SYSTEM_DEFAULT_TIMEZONE = 'America/Campo_Grande';
export const SYSTEM_DEFAULT_LOCALE = 'pt-BR';

export const MANUTENCAO_STATUSS_CONFLITANTES = [
  'Agendada',
  'EmAndamento',
  'Pendente',
  'AguardandoConfirmacao',
];

export const FAR_FUTURE_UTC_DATE = new Date('9999-12-31T23:59:59.999Z');