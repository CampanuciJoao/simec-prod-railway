export function getTipoBadgeVariant(tipo) {
  const normalized = String(tipo || '').toLowerCase();

  if (normalized.includes('preventiva')) return 'blue';
  if (normalized.includes('corretiva')) return 'orange';
  if (normalized.includes('calibracao')) return 'purple';
  if (normalized.includes('inspecao')) return 'green';

  return 'outline';
}