export function getEquipamentoCardStyles(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'operante') {
    return {
      borderClass: 'border-l-[#10b981]',
      backgroundClass: 'bg-[#f0fdf4]',
    };
  }

  if (normalized === 'inoperante') {
    return {
      borderClass: 'border-l-[#ef4444]',
      backgroundClass: 'bg-[#fef2f2]',
    };
  }

  if (normalized === 'emmanutencao') {
    return {
      borderClass: 'border-l-[#f59e0b]',
      backgroundClass: 'bg-[#fffbeb]',
    };
  }

  if (normalized === 'usolimitado') {
    return {
      borderClass: 'border-l-[#3b82f6]',
      backgroundClass: 'bg-[#eff6ff]',
    };
  }

  return {
    borderClass: 'border-l-slate-400',
    backgroundClass: 'bg-white',
  };
}