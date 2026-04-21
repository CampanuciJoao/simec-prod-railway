import { formatarDowntime, somarDowntimeHoras } from '@/utils/bi/downtimeUtils';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  return Number(value || 0);
}

export function mapRankingUnidades(rankingUnidades = []) {
  return toArray(rankingUnidades).map((item) => {
    const horasParado = toNumber(item.horasParado);

    return {
      ...item,
      horasParado,
      downtimeFormatado: formatarDowntime(horasParado),
    };
  });
}

export function mapDowntimePorUnidadeChartData(rankingUnidades = []) {
  return toArray(rankingUnidades).map((item) => ({
    name: item.nome,
    value: toNumber(item.horasParado),
    subtitle: item.downtimeFormatado || formatarDowntime(item.horasParado),
  }));
}

export function mapRankingFrequencia(ranking = []) {
  return toArray(ranking).map((item) => ({
    ...item,
    corretivas: toNumber(item.corretivas),
  }));
}

export function mapRankingDowntime(ranking = []) {
  return toArray(ranking).map((item) => {
    const horasParado = toNumber(item.horasParado);

    return {
      ...item,
      horasParado,
      downtimeFormatado: formatarDowntime(horasParado),
    };
  });
}

export function buildResumoCards(dados, rankingDowntime, rankingUnidades) {
  const totalAtivos = toNumber(dados?.resumoGeral?.totalAtivos);
  const preventivas = toNumber(dados?.resumoGeral?.preventivas);
  const corretivas = toNumber(dados?.resumoGeral?.corretivas);

  const totalDowntimeHoras = somarDowntimeHoras(
    rankingDowntime,
    'horasParado'
  );

  const unidadeCritica = rankingUnidades.length > 0 ? rankingUnidades[0] : null;

  return {
    totalAtivos,
    preventivas,
    corretivas,
    downtimeAcumulado: formatarDowntime(totalDowntimeHoras),
    unidadeCritica: unidadeCritica
      ? {
          nome: unidadeCritica.nome,
          downtime: formatarDowntime(unidadeCritica.horasParado),
        }
      : null,
  };
}
