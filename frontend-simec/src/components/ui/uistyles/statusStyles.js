import { normalizeStatus } from '@/utils/status/statusUtils';

const STATUS_VARIANT_MAP = {
  // EQUIPAMENTO
  operante: 'green',
  emmanutencao: 'yellow',
  inoperante: 'red',
  usolimitado: 'orange',
  desativado: 'slate',

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

const STATUS_TONE_MAP = {
  blue: {
    soft: 'var(--brand-primary-soft)',
    strong: 'var(--brand-primary)',
    border: 'var(--brand-primary-soft)',
  },
  orange: {
    soft: 'var(--color-warning-soft)',
    strong: 'var(--color-warning)',
    border: 'var(--color-warning-soft)',
  },
  green: {
    soft: 'var(--color-success-soft)',
    strong: 'var(--color-success)',
    border: 'var(--color-success-soft)',
  },
  yellow: {
    soft: 'var(--color-warning-soft)',
    strong: 'var(--color-warning)',
    border: 'var(--color-warning-soft)',
  },
  red: {
    soft: 'var(--color-danger-soft)',
    strong: 'var(--color-danger)',
    border: 'var(--color-danger-soft)',
  },
  slate: {
    soft: 'var(--bg-surface-subtle)',
    strong: 'var(--text-secondary)',
    border: 'var(--border-soft)',
  },
  purple: {
    soft: 'var(--color-info-soft)',
    strong: 'var(--color-info)',
    border: 'var(--color-info-soft)',
  },
};

export function getStatusVariant(value) {
  const normalized = normalizeStatus(value);
  return STATUS_VARIANT_MAP[normalized] || 'slate';
}

export function getStatusTone(value) {
  const variant = getStatusVariant(value);
  return STATUS_TONE_MAP[variant] || STATUS_TONE_MAP.slate;
}

export function formatStatusLabel(value) {
  if (!value) return 'N/A';

  return String(value)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim();
}
