import { normalizeStatus } from '@/utils/status/statusUtils';

const STATUS_VARIANT_MAP = {
  // EQUIPAMENTO
  operante: 'green',
  emmanutencao: 'yellow',
  inoperante: 'red',
  usolimitado: 'orange',

  // MANUTENÇÃO
  agendada: 'blue',
  emandamento: 'yellow',
  aguardandoconfirmacao: 'orange',
  concluida: 'green',
  cancelada: 'slate',

  // STATUS GERAL
  ativo: 'green',
  expirado: 'red',
  vigente: 'green',
  venceembreve: 'yellow',

  // VISUALIZAÇÃO
  naovisto: 'blue',
  visto: 'slate',

  // TIPOS DE MANUTENÇÃO
  preventiva: 'blue',
  corretiva: 'orange',
  calibracao: 'purple',
  inspecao: 'green',
};

export function getStatusVariant(value) {
  const normalized = normalizeStatus(value);
  return STATUS_VARIANT_MAP[normalized] || 'slate';
}