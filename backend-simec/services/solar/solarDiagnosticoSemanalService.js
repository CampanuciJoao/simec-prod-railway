// Diagnostico semanal POR INVERTER — cross-fabricante. Sempre olha os
// ultimos 7 dias e calcula pra cada inverter ativo:
//
//   - picoTempC   : max inverterTempC
//   - tempMediaC  : media inverterTempC
//   - tempMinC    : min inverterTempC
//   - amostrasTemp: quantas leituras tem temperatura (confiabilidade)
//   - horasOffline: soma de gaps > GAP_OFFLINE_MIN_MS entre snapshots
//                   consecutivos (+ tempo desde ultimo snapshot se agora
//                   ja passou do gap)
//   - horasDerated: snapshots com runningState em DERATED_STATES, cada um
//                   contado como o intervalo medio ate o proximo (bounded
//                   por GAP_OFFLINE_MIN_MS pra nao inflar com gaps longos)
//   - ultimaLeitura: capturedAt do snapshot mais recente
//   - picoPotenciaKw: max powerKw (contexto de geracao)
//
// E a nivel de PLANTA (quando tem bateria):
//   - quedas: count de SolarOutage com inicioEm nos ultimos 7d
//   - duracaoQuedasMin: soma de duracaoMin dessas quedas

import prisma from '../prismaService.js';

const DIAS = 7;
const JANELA_MS = DIAS * 24 * 60 * 60 * 1000;

// Gap tolerado entre snapshots antes de contar como offline. Padrao
// generoso (15min) pra absorver o rate limit Sungrow de 5min + eventuais
// retries. Growatt/FoxESS tem poll de 1min — qualquer gap >15min e
// claramente problema (worker caiu, credencial expirou, etc).
const GAP_OFFLINE_MIN_MS = 15 * 60 * 1000;

// Convencao: DERATED_STATES come da doc oficial Sungrow Apendice 12.1
// (128 "Derated running", 33024 "Derated by overtemp"). FoxESS tambem
// reporta 128 em alguns modelos quando limita potencia por rede.
const DERATED_STATES = new Set([128, 33024]);

function minutosEntre(a, b) {
  return (b.getTime() - a.getTime()) / 60000;
}

function calcularOfflineEDerated(snapshots) {
  // snapshots ordenado por capturedAt asc, com { capturedAt, runningState }
  let offlineMs = 0;
  let deratedMs = 0;

  for (let i = 1; i < snapshots.length; i++) {
    const anterior = snapshots[i - 1];
    const atual = snapshots[i];
    const gapMs = atual.capturedAt.getTime() - anterior.capturedAt.getTime();

    if (gapMs > GAP_OFFLINE_MIN_MS) {
      // Conta o excedente como offline (nao conta ate o threshold pra
      // nao penalizar o intervalo normal de coleta).
      offlineMs += gapMs - GAP_OFFLINE_MIN_MS;
    }

    // Se o snapshot anterior estava derated, conta o intervalo ate o
    // proximo como tempo em derated — mas limita ao threshold pra nao
    // inflar com periodos de offline longos.
    if (anterior.runningState != null && DERATED_STATES.has(anterior.runningState)) {
      deratedMs += Math.min(gapMs, GAP_OFFLINE_MIN_MS);
    }
  }

  // Tempo desde o ultimo snapshot ate agora, se passou do threshold
  if (snapshots.length > 0) {
    const desdeUltimo = Date.now() - snapshots[snapshots.length - 1].capturedAt.getTime();
    if (desdeUltimo > GAP_OFFLINE_MIN_MS) {
      offlineMs += desdeUltimo - GAP_OFFLINE_MIN_MS;
    }
  } else {
    // Sem snapshots nos ultimos 7d — considera tudo offline
    offlineMs = JANELA_MS;
  }

  return {
    horasOffline: Number((offlineMs / 3600000).toFixed(1)),
    horasDerated: Number((deratedMs / 3600000).toFixed(1)),
  };
}

function statsTemperatura(snapshots) {
  const temps = snapshots
    .map((s) => s.inverterTempC)
    .filter((t) => t != null && Number.isFinite(t));
  if (temps.length === 0) {
    return { picoTempC: null, tempMediaC: null, tempMinC: null, amostrasTemp: 0 };
  }
  let min = Infinity, max = -Infinity, soma = 0;
  for (const t of temps) {
    if (t < min) min = t;
    if (t > max) max = t;
    soma += t;
  }
  return {
    picoTempC: Number(max.toFixed(1)),
    tempMediaC: Number((soma / temps.length).toFixed(1)),
    tempMinC: Number(min.toFixed(1)),
    amostrasTemp: temps.length,
  };
}

function picoPotencia(snapshots) {
  let max = null;
  for (const s of snapshots) {
    if (s.powerKw != null && (max == null || s.powerKw > max)) max = s.powerKw;
  }
  return max != null ? Number(max.toFixed(2)) : null;
}

export async function obterDiagnosticoSemanal({ tenantId, plantId }) {
  const inicio = new Date(Date.now() - JANELA_MS);

  const plant = await prisma.solarPlant.findFirst({
    where: { tenantId, id: plantId },
    select: {
      id: true, nome: true, temBateria: true,
      inverters: {
        where: { ativo: true },
        select: {
          id: true, provider: true, inverterSn: true,
          modeloInversor: true, nome: true,
        },
      },
    },
  });
  if (!plant) {
    const err = new Error('Planta nao encontrada');
    err.status = 404;
    throw err;
  }

  const porInverter = await Promise.all(
    plant.inverters.map(async (inv) => {
      const snapshots = await prisma.solarSnapshot.findMany({
        where: { tenantId, inverterId: inv.id, capturedAt: { gte: inicio } },
        orderBy: { capturedAt: 'asc' },
        select: {
          capturedAt: true, inverterTempC: true, runningState: true,
          powerKw: true,
        },
      });
      const { horasOffline, horasDerated } = calcularOfflineEDerated(snapshots);
      const tempStats = statsTemperatura(snapshots);
      return {
        inverterId: inv.id,
        provider: inv.provider,
        inverterSn: inv.inverterSn,
        modeloInversor: inv.modeloInversor,
        nome: inv.nome,
        amostras: snapshots.length,
        ultimaLeitura: snapshots.length > 0
          ? snapshots[snapshots.length - 1].capturedAt
          : null,
        horasOffline,
        horasDerated,
        picoPotenciaKw: picoPotencia(snapshots),
        ...tempStats,
      };
    })
  );

  // Quedas de energia no periodo (so plantas com bateria tem outage track)
  let quedasInfo = null;
  if (plant.temBateria) {
    const quedas = await prisma.solarOutage.findMany({
      where: { tenantId, plantId, inicioEm: { gte: inicio } },
      select: { duracaoMin: true, fimEm: true, inicioEm: true },
    });
    const totalMin = quedas.reduce((acc, q) => {
      if (q.duracaoMin != null) return acc + q.duracaoMin;
      // Queda em andamento — conta ate agora
      return acc + Math.max(0, minutosEntre(q.inicioEm, new Date()));
    }, 0);
    quedasInfo = {
      total: quedas.length,
      duracaoTotalMin: Math.round(totalMin),
      emAndamento: quedas.filter((q) => q.fimEm == null).length,
    };
  }

  return {
    periodo: { inicio, fim: new Date(), dias: DIAS },
    plant: { id: plant.id, nome: plant.nome, temBateria: plant.temBateria },
    inverters: porInverter,
    quedas: quedasInfo,
  };
}
