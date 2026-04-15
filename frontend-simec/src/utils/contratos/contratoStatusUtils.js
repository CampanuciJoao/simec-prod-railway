export function getDynamicStatus(contrato) {
  if (!contrato) return 'Cancelado';

  if (contrato.status !== 'Ativo') {
    return contrato.status || 'Cancelado';
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataFim = new Date(contrato.dataFim);

  if (Number.isNaN(dataFim.getTime())) {
    return contrato.status || 'Ativo';
  }

  if (dataFim < hoje) {
    return 'Expirado';
  }

  const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) {
    return 'Vence em breve';
  }

  return 'Ativo';
}

export function getStatusBadgeVariant(statusText) {
  const normalized = String(statusText || '').toLowerCase();

  if (normalized === 'ativo') return 'green';
  if (normalized === 'vence em breve') return 'yellow';
  if (normalized === 'expirado') return 'red';
  if (normalized === 'cancelado') return 'slate';

  return 'slate';
}

export function getRowHighlightClass(statusText) {
  const normalized = String(statusText || '').toLowerCase();

  if (normalized === 'ativo') return 'border-l-emerald-500';
  if (normalized === 'vence em breve') return 'border-l-amber-500';
  if (normalized === 'expirado') return 'border-l-red-500';
  if (normalized === 'cancelado') return 'border-l-slate-400';

  return 'border-l-slate-300';
}