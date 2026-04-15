import {
  faExclamationTriangle,
  faInfoCircle,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';

export function getAlertaVisual(alerta) {
  const prioridadeMap = {
    Alta: {
      border: 'border-red-500',
      bg: 'bg-red-50',
      text: 'text-red-700',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
    },
    Media: {
      border: 'border-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
    },
    Baixa: {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
  };

  const recomendacaoStyle = {
    border: 'border-violet-500',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    badge: 'bg-violet-100 text-violet-700',
  };

  if (alerta?.tipo === 'Recomendação') {
    return recomendacaoStyle;
  }

  return (
    prioridadeMap[alerta?.prioridade] || {
      border: 'border-slate-300',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      badge: 'bg-slate-100 text-slate-700',
    }
  );
}

export function getAlertaIcon(alerta) {
  if (alerta?.tipo === 'Recomendação') return faLightbulb;
  if (alerta?.prioridade === 'Alta') return faExclamationTriangle;
  return faInfoCircle;
}

export function buildAgendarPreventivaLink(alerta) {
  const rawLink = alerta?.link || '';
  const match = rawLink.match(/\/equipamentos\/ficha-tecnica\/([^/?]+)/i);
  const equipamentoId = match?.[1];

  if (equipamentoId) {
    return `/manutencoes/agendar?tipo=Preventiva&equipamentoId=${encodeURIComponent(
      equipamentoId
    )}`;
  }

  return '/manutencoes/agendar?tipo=Preventiva';
}

export function buildQuickFilterHandler(page, config) {
  return () => {
    page.clearAllFilters();
    const target = page.selectFiltersConfig.find((f) => f.id === config.filterId);
    target?.onChange(config.value);
  };
}