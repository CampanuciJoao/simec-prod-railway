function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeMetricas(item) {
  const source = item?.metricas || item?.resumo || item?.dados || {};

  return Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      label: key,
      value,
    }));
}

function normalizeTimeline(item) {
  return toArray(item?.timeline || item?.historico || item?.eventos).filter(
    Boolean
  );
}

function normalizeTags(item) {
  return toArray(item?.tags || item?.labels || item?.categorias).filter(Boolean);
}

function resolveTitle(item) {
  return (
    item?.titulo ||
    item?.title ||
    item?.nome ||
    item?.modelo ||
    item?.unidade ||
    'Detalhes'
  );
}

function resolveSubtitle(item) {
  return (
    item?.subtitulo ||
    item?.subtitle ||
    item?.descricao ||
    item?.description ||
    ''
  );
}

export function buildDrawerData(item) {
  if (!item) return null;

  return {
    id: item.id || null,
    title: resolveTitle(item),
    subtitle: resolveSubtitle(item),
    status: item.status || item.nivel || item.riskLevel || null,
    metricas: normalizeMetricas(item),
    timeline: normalizeTimeline(item),
    tags: normalizeTags(item),
    raw: item,
  };
}

export function buildDrawerContent({
  type,
  resumoCards,
  rankingFrequencia,
  rankingDowntime,
  rankingUnidades,
  handlers = {},
}) {
  switch (type) {
    case 'ativos':
      return {
        title: 'Ativos monitorados',
        description: 'Resumo dos ativos acompanhados no BI.',
        data: resumoCards,
        action: handlers.goToAtivos || null,
      };

    case 'preventivas':
      return {
        title: 'Manutenções preventivas',
        description: 'Indicadores de preventivas registradas.',
        data: resumoCards,
        action: handlers.goToPreventivas || null,
      };

    case 'corretivas':
      return {
        title: 'Manutenções corretivas',
        description: 'Indicadores de corretivas registradas.',
        data: resumoCards,
        action: handlers.goToCorretivas || null,
      };

    case 'downtime':
      return {
        title: 'Downtime acumulado',
        description: 'Resumo do tempo parado consolidado.',
        data: rankingDowntime || [],
        action: handlers.goToDowntime || null,
      };

    case 'unidadeCritica':
      return {
        title: 'Unidade crítica',
        description: 'Unidade com maior impacto operacional.',
        data: rankingUnidades || [],
        action: handlers.goToUnidadeCritica || null,
      };

    case 'rankingFrequencia':
      return {
        title: 'Ranking por frequência',
        description: 'Equipamentos com maior recorrência de corretivas.',
        data: rankingFrequencia || [],
        action: handlers.drillDown || null,
      };

    case 'rankingDowntime':
      return {
        title: 'Ranking por downtime',
        description: 'Equipamentos com maior tempo parado.',
        data: rankingDowntime || [],
        action: handlers.drillDown || null,
      };

    case 'rankingUnidades':
      return {
        title: 'Ranking de unidades',
        description: 'Unidades com maior impacto em downtime.',
        data: rankingUnidades || [],
        action: handlers.goToUnidadeCritica || null,
      };

    default:
      return {
        title: 'Detalhes',
        description: '',
        data: null,
        action: null,
      };
  }
}
