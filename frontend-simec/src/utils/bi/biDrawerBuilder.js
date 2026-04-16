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
  return toArray(item?.timeline || item?.historico || item?.eventos).filter(Boolean);
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