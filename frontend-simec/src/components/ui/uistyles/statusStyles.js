export function getStatusBadgeVariant(status) {
  const s = String(status || '').toLowerCase();

  if (s === 'operante') return 'green';
  if (s === 'inoperante') return 'red';
  if (s === 'emmanutencao') return 'yellow';
  if (s === 'usolimitado') return 'blue';

  return 'slate';
}

export function getStatusCardStyles(status) {
  const s = String(status || '').toLowerCase();

  if (s === 'operante') {
    return {
      border: 'border-l-emerald-500',
      bg: 'bg-emerald-50',
    };
  }

  if (s === 'inoperante') {
    return {
      border: 'border-l-red-500',
      bg: 'bg-red-50',
    };
  }

  if (s === 'emmanutencao') {
    return {
      border: 'border-l-amber-500',
      bg: 'bg-amber-50',
    };
  }

  if (s === 'usolimitado') {
    return {
      border: 'border-l-blue-500',
      bg: 'bg-blue-50',
    };
  }

  return {
    border: 'border-l-slate-400',
    bg: 'bg-white',
  };
}