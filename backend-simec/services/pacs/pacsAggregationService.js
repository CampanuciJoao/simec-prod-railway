import prisma from '../prismaService.js';

function startOfUtcDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function computeVariance(values = []) {
  if (!values.length) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return (
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  );
}

function computeDurationMinutes(study) {
  if (!(study.startedAt instanceof Date) || !(study.endedAt instanceof Date)) {
    return null;
  }

  const diff = Math.max(0, study.endedAt.getTime() - study.startedAt.getTime());
  return diff / 60000;
}

function buildFeatureRow({ tenantId, equipamentoId, day, studies, previousWeekFeature }) {
  const durations = studies
    .map(computeDurationMinutes)
    .filter((value) => Number.isFinite(value));

  const hours = new Map();
  const modalities = {};
  let volumeSeries = 0;
  let volumeInstances = 0;

  for (const study of studies) {
    volumeSeries += Number(study.numberOfSeries || 0);
    volumeInstances += Number(study.numberOfInstances || 0);

    const hour = study.startedAt.getUTCHours();
    hours.set(hour, (hours.get(hour) || 0) + 1);

    if (study.modality) {
      modalities[study.modality] = (modalities[study.modality] || 0) + 1;
    }
  }

  const sorted = [...studies].sort(
    (left, right) => left.startedAt.getTime() - right.startedAt.getTime()
  );

  let gapMaximoInatividade = null;

  for (let index = 1; index < sorted.length; index += 1) {
    const gapHours =
      (sorted[index].startedAt.getTime() - sorted[index - 1].startedAt.getTime()) /
      3600000;
    gapMaximoInatividade = Math.max(gapMaximoInatividade || 0, gapHours);
  }

  const peakHour = [...hours.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const uniqueActiveHours = new Set(studies.map((study) => study.startedAt.getUTCHours()));
  const disponibilidade = Number(
    ((uniqueActiveHours.size / 24) * 100).toFixed(2)
  );

  const volumeEstudos = studies.length;
  const previousVolume = Number(previousWeekFeature?.volumeEstudos || 0);
  const tendenciaVsSemanaAnterior =
    previousVolume > 0
      ? Number((((volumeEstudos - previousVolume) / previousVolume) * 100).toFixed(2))
      : null;

  return {
    tenantId,
    equipamentoId,
    data: day,
    volumeEstudos,
    volumeSeries,
    volumeInstancias: volumeInstances,
    duracaoMediaMinutos: durations.length
      ? Number(
          (durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2)
        )
      : null,
    duracaoVariancia: durations.length
      ? Number(computeVariance(durations).toFixed(2))
      : null,
    horarioPicoUso: peakHour,
    gapMaximoInatividade:
      gapMaximoInatividade === null ? null : Number(gapMaximoInatividade.toFixed(2)),
    disponibilidade,
    mixModalidades: JSON.stringify(modalities),
    tendenciaVsSemanaAnterior,
  };
}

async function shouldSuppressByOperationalContext({
  tenantId,
  equipamentoId,
  dayStart,
  dayEnd,
}) {
  const [manutencoes, ocorrencias] = await Promise.all([
    prisma.manutencao.count({
      where: {
        tenantId,
        equipamentoId,
        OR: [
          {
            dataHoraAgendamentoInicio: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
          {
            dataHoraAgendamentoFim: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        ],
      },
    }),
    prisma.ocorrencia.count({
      where: {
        tenantId,
        equipamentoId,
        data: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    }),
  ]);

  return manutencoes > 0 || ocorrencias > 0;
}

function buildSignal(type, detail) {
  return { type, detail };
}

function evaluateConsecutiveDrop(history = []) {
  if (history.length < 4) return false;

  const recent = history.slice(-4);
  const baseline = recent[0]?.volumeEstudos || 0;
  if (!baseline) return false;

  return recent.slice(1).every((item) => item.volumeEstudos < baseline * 0.7);
}

function evaluateRecentVariance(history = []) {
  if (history.length < 4) return false;
  const recent = history.slice(-4);
  const baseline = recent[0]?.duracaoVariancia || 0;
  if (!baseline) return false;

  return recent.slice(1).every((item) => Number(item.duracaoVariancia || 0) > baseline * 2);
}

function evaluateGap(history = [], candidate) {
  const base = history
    .map((item) => Number(item.gapMaximoInatividade || 0))
    .filter((value) => value > 0);

  if (!base.length || !candidate?.gapMaximoInatividade) return false;

  const average = base.reduce((sum, value) => sum + value, 0) / base.length;
  return candidate.gapMaximoInatividade > average * 3;
}

export async function calcularAnomaliaFeature(feature) {
  const dayStart = startOfUtcDay(feature.data);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  if (
    await shouldSuppressByOperationalContext({
      tenantId: feature.tenantId,
      equipamentoId: feature.equipamentoId,
      dayStart,
      dayEnd,
    })
  ) {
    return { anomalia: false, sinaisAnomalia: [] };
  }

  const firstFeature = await prisma.pacsEquipmentFeatureDaily.findFirst({
    where: {
      tenantId: feature.tenantId,
      equipamentoId: feature.equipamentoId,
    },
    orderBy: {
      data: 'asc',
    },
    select: {
      data: true,
    },
  });

  if (
    !firstFeature ||
    dayStart.getTime() - startOfUtcDay(firstFeature.data).getTime() <
      60 * 24 * 60 * 60 * 1000
  ) {
    return { anomalia: false, sinaisAnomalia: [] };
  }

  const history = await prisma.pacsEquipmentFeatureDaily.findMany({
    where: {
      tenantId: feature.tenantId,
      equipamentoId: feature.equipamentoId,
      data: {
        lt: feature.data,
        gte: new Date(feature.data.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: {
      data: 'asc',
    },
  });

  const recent = [...history, feature].slice(-7);
  const sinais = [];

  if (evaluateConsecutiveDrop(recent)) {
    sinais.push(buildSignal('queda_volume', 'Queda superior a 30% por 3 dias consecutivos.'));
  }

  if (evaluateGap(history, feature)) {
    sinais.push(buildSignal('gap_inatividade', 'Gap de inatividade acima de 3x a media historica.'));
  }

  if (evaluateRecentVariance(recent)) {
    sinais.push(buildSignal('variancia_duracao', 'Variancia de duracao acima do padrao historico por 3 dias.'));
  }

  const isWeekday = ![0, 6].includes(feature.data.getUTCDay());
  if (isWeekday && Number(feature.disponibilidade || 0) < 50) {
    sinais.push(buildSignal('baixa_disponibilidade', 'Disponibilidade abaixo de 50% em dia util.'));
  }

  return {
    anomalia: sinais.length > 0,
    sinaisAnomalia: sinais,
  };
}

export async function agregarEstudosPorEquipamento({
  tenantId,
  studies = [],
}) {
  const grouped = new Map();
  const unresolved = [];

  const aeTitles = [
    ...new Set(studies.map((study) => study.aeTitle).filter(Boolean)),
  ];

  const equipamentos = aeTitles.length
    ? await prisma.equipamento.findMany({
        where: {
          tenantId,
          aeTitle: {
            in: aeTitles,
          },
        },
        select: {
          id: true,
          aeTitle: true,
        },
      })
    : [];

  const equipamentoByAe = new Map(
    equipamentos.map((equipamento) => [equipamento.aeTitle, equipamento])
  );

  for (const study of studies) {
    if (!study.aeTitle || !equipamentoByAe.has(study.aeTitle)) {
      unresolved.push({
        aeTitle: study.aeTitle || null,
        stationName: study.stationName || null,
        institutionName: study.institutionName || null,
      });
      continue;
    }

    const equipamento = equipamentoByAe.get(study.aeTitle);
    const day = startOfUtcDay(study.startedAt).toISOString();
    const key = `${equipamento.id}:${day}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        equipamentoId: equipamento.id,
        day: startOfUtcDay(study.startedAt),
        studies: [],
      });
    }

    grouped.get(key).studies.push(study);
  }

  const items = [];

  for (const group of grouped.values()) {
    const previousWeekFeature = await prisma.pacsEquipmentFeatureDaily.findFirst({
      where: {
        tenantId,
        equipamentoId: group.equipamentoId,
        data: new Date(group.day.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      select: {
        volumeEstudos: true,
      },
    });

    const feature = buildFeatureRow({
      tenantId,
      equipamentoId: group.equipamentoId,
      day: group.day,
      studies: group.studies,
      previousWeekFeature,
    });

    const anomaly = await calcularAnomaliaFeature(feature);

    items.push({
      ...feature,
      anomalia: anomaly.anomalia,
      sinaisAnomalia: JSON.stringify(anomaly.sinaisAnomalia),
    });
  }

  return {
    items,
    unresolved,
  };
}
