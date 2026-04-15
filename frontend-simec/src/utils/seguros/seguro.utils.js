export function getStatusBadgeClass(statusText) {
  const normalized = String(statusText || '').toLowerCase();

  if (normalized === 'ativo') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (normalized === 'vence em breve') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (normalized === 'expirado') return 'bg-red-100 text-red-700 border-red-200';
  if (normalized === 'cancelado') return 'bg-slate-100 text-slate-700 border-slate-200';

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function getRowHighlightClass(statusText) {
  const normalized = String(statusText || '').toLowerCase();

  if (normalized === 'ativo') return 'border-l-emerald-500';
  if (normalized === 'vence em breve') return 'border-l-amber-500';
  if (normalized === 'expirado') return 'border-l-red-500';
  if (normalized === 'cancelado') return 'border-l-slate-400';

  return 'border-l-slate-300';
}

export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}