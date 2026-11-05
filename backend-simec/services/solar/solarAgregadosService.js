// Agregacao Solar — Fase 3.
//
// Dois crons:
//   - solar-agregados-diario (02:30 UTC): fecha o dia D-1 pra cada planta.
//     Calcula kwh gerado, valor economizado, horas offline, falhas no dia.
//     Grava em SolarAgregadoDiario (unique por tenantId+plantId+dia).
//     Em seguida acumula no SolarAgregadoMensal do mes corrente.
//   - solar-agregados-mensal (dia 1, 03:00 UTC): fecha o mes anterior,
//     calcula variacao vs mes antes, deixa imutavel.
//
// Fonte dos numeros:
//   - kwhGerado: max(generationKwhTotal) - min(generationKwhTotal) do dia,
//     fallback max(generationKwhDay)
//   - kwhConsumidoRede: soma (gridConsumptionPower em kW * delta horas)
//   - kwhExportadoRede: soma (feedinPower em kW * delta horas)
//   - valorEconomizadoBrl: kwhGerado * (plant.tarifaKwh || 0.64)
//   - horasOffline: soma(duracaoMin) de SolarOutage no dia / 60
//   - falhasAbertas: count SolarFalha com reportadaEm no dia
//   - falhasResolvidas: count SolarFalha com resolvidaEm no dia
//   - picosKw: max(powerKw) do dia
//   - tempMaxC: max(inverterTempC) do dia
//   - prAprox: kwhGerado / (capacidadeKwp * HORAS_SOL_TIPICAS)

import prisma from '../prismaService.js';

const TARIFA_DEFAULT_BRL_KWH = 0.64; // UC alta tensao MS fora ponta
const HORAS_SOL_TIPICAS = 5.0;       // estimativa media Brasil CS

function inicioFimDoDia(dia) {
  const inicio = new Date(dia);
  inicio.setUTCHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 1);
  return { inicio, fim };
}

function diaAnterior(d = new Date()) {
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() - 1);
  t.setUTCHours(0, 0, 0, 0);
  return t;
}

async function calcularAgregadoDoDia({ tenantId, plant, dia }) {
  const { inicio, fim } = inicioFimDoDia(dia);
  const snapshots = await prisma.solarSnapshot.findMany({
    where: { tenantId, plantId: plant.id, capturedAt: { gte: inicio, lt: fim } },
    orderBy: { capturedAt: 'asc' },
    select: {
      capturedAt: true, powerKw: true, generationKwhDay: true,
      generationKwhTotal: true, gridConsumptionPower: true, feedinPower: true,
      inverterTempC: true,
    },
  });

  if (snapshots.length === 0) {
    return {
      kwhGerado: 0, kwhConsumidoRede: 0, kwhExportadoRede: 0,
      valorEconomizadoBrl: 0, horasOffline: null,
      picosKw: null, tempMaxC: null, prAprox: null,
    };
  }

  // kWh gerado: preferencia pro contador acumulado (mais robusto)
  let kwhGerado = null;
  const totais = snapshots.map((s) => s.generationKwhTotal).filter((v) => v != null);
  if (totais.length >= 2) {
    kwhGerado = Math.max(0, Math.max(...totais) - Math.min(...totais));
  } else {
    const dias = snapshots.map((s) => s.generationKwhDay).filter((v) => v != null);
    kwhGerado = dias.length ? Math.max(...dias) : 0;
  }

  // Integral trapezoidal pra consumo/exportacao (kW * horas)
  let kwhConsumidoRede = 0, kwhExportadoRede = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const dt = (snapshots[i].capturedAt.getTime() - snapshots[i - 1].capturedAt.getTime()) / 3600000;
    if (dt > 0 && dt < 1) { // ignora buracos >1h pra nao inflar
      const avgCons = ((snapshots[i].gridConsumptionPower ?? 0) + (snapshots[i - 1].gridConsumptionPower ?? 0)) / 2;
      const avgFeed = ((snapshots[i].feedinPower ?? 0) + (snapshots[i - 1].feedinPower ?? 0)) / 2;
      kwhConsumidoRede += avgCons * dt;
      kwhExportadoRede += avgFeed * dt;
    }
  }

  const tarifa = plant.tarifaKwh ?? TARIFA_DEFAULT_BRL_KWH;
  const valorEconomizadoBrl = kwhGerado * tarifa;

  const picos = snapshots.map((s) => s.powerKw).filter((v) => v != null);
  const picosKw = picos.length ? Math.max(...picos) : null;
  const temps = snapshots.map((s) => s.inverterTempC).filter((v) => v != null);
  const tempMaxC = temps.length ? Math.max(...temps) : null;

  const prAprox = plant.capacidadeKwp && plant.capacidadeKwp > 0
    ? kwhGerado / (plant.capacidadeKwp * HORAS_SOL_TIPICAS)
    : null;

  // Quedas no dia
  const quedas = await prisma.solarOutage.findMany({
    where: { tenantId, plantId: plant.id, inicioEm: { gte: inicio, lt: fim } },
    select: { duracaoMin: true },
  });
  const horasOffline = quedas.length
    ? quedas.reduce((acc, q) => acc + ((q.duracaoMin || 0) / 60), 0)
    : null;

  // Falhas abertas/resolvidas no dia
  const [falhasAbertas, falhasResolvidas] = await Promise.all([
    prisma.solarFalha.count({ where: { tenantId, plantId: plant.id, reportadaEm: { gte: inicio, lt: fim } } }),
    prisma.solarFalha.count({ where: { tenantId, plantId: plant.id, resolvidaEm: { gte: inicio, lt: fim } } }),
  ]);

  return {
    kwhGerado,
    kwhConsumidoRede,
    kwhExportadoRede,
    valorEconomizadoBrl,
    horasOffline,
    picosKw,
    tempMaxC,
    prAprox,
    falhasAbertas,
    falhasResolvidas,
  };
}

async function upsertAgregadoMensalDePlanta({ tenantId, plantId, ano, mes }) {
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
  const fimMes = new Date(Date.UTC(ano, mes, 1));
  const diarios = await prisma.solarAgregadoDiario.findMany({
    where: { tenantId, plantId, dia: { gte: inicioMes, lt: fimMes } },
  });

  const soma = (campo) => diarios.reduce((acc, d) => acc + (d[campo] || 0), 0);
  const kwhGerado = soma('kwhGerado');
  const kwhConsumidoRede = soma('kwhConsumidoRede');
  const kwhExportadoRede = soma('kwhExportadoRede');
  const valorEconomizadoBrl = soma('valorEconomizadoBrl');
  const horasOffline = soma('horasOffline');
  const falhasTotal = diarios.reduce((acc, d) => acc + d.falhasAbertas, 0);
  const picos = diarios.map((d) => d.picosKw).filter((v) => v != null);
  const picosKw = picos.length ? Math.max(...picos) : null;
  const prs = diarios.map((d) => d.prAprox).filter((v) => v != null);
  const prAproxMedio = prs.length ? prs.reduce((a, b) => a + b, 0) / prs.length : null;
  const diasComGeracao = diarios.filter((d) => (d.kwhGerado || 0) > 0).length;

  const quedasTotal = await prisma.solarOutage.count({
    where: { tenantId, plantId, inicioEm: { gte: inicioMes, lt: fimMes } },
  });

  // Variacao vs mes anterior
  const mesAnteriorAno = mes === 1 ? ano - 1 : ano;
  const mesAnteriorMes = mes === 1 ? 12 : mes - 1;
  const anterior = await prisma.solarAgregadoMensal.findUnique({
    where: { tenantId_plantId_ano_mes: { tenantId, plantId, ano: mesAnteriorAno, mes: mesAnteriorMes } },
    select: { kwhGerado: true },
  });
  const variacaoKwhMesAnterior = anterior?.kwhGerado && anterior.kwhGerado > 0
    ? (kwhGerado - anterior.kwhGerado) / anterior.kwhGerado
    : null;

  await prisma.solarAgregadoMensal.upsert({
    where: { tenantId_plantId_ano_mes: { tenantId, plantId, ano, mes } },
    create: {
      tenantId, plantId, ano, mes,
      kwhGerado, kwhConsumidoRede, kwhExportadoRede, valorEconomizadoBrl,
      horasOffline, falhasTotal, quedasTotal, diasComGeracao, picosKw,
      prAproxMedio, variacaoKwhMesAnterior,
    },
    update: {
      kwhGerado, kwhConsumidoRede, kwhExportadoRede, valorEconomizadoBrl,
      horasOffline, falhasTotal, quedasTotal, diasComGeracao, picosKw,
      prAproxMedio, variacaoKwhMesAnterior,
    },
  });
}

export async function fecharDiaAnterior() {
  const dia = diaAnterior();
  const plants = await prisma.solarPlant.findMany({
    where: { ativo: true },
    select: { id: true, tenantId: true, nome: true, tarifaKwh: true, capacidadeKwp: true },
  });

  const resultados = [];
  for (const plant of plants) {
    try {
      const agregado = await calcularAgregadoDoDia({
        tenantId: plant.tenantId, plant, dia,
      });
      const diario = await prisma.solarAgregadoDiario.upsert({
        where: { tenantId_plantId_dia: { tenantId: plant.tenantId, plantId: plant.id, dia } },
        create: { tenantId: plant.tenantId, plantId: plant.id, dia, ...agregado },
        update: agregado,
      });

      // Atualiza o mes corrente pra manter o card "Este mes" fresco
      await upsertAgregadoMensalDePlanta({
        tenantId: plant.tenantId, plantId: plant.id,
        ano: dia.getUTCFullYear(), mes: dia.getUTCMonth() + 1,
      });

      resultados.push({ plantId: plant.id, ok: true, kwhGerado: diario.kwhGerado });
    } catch (err) {
      console.error(`[SOLAR_AGREGADOS] Falha no dia ${dia.toISOString().slice(0, 10)} planta ${plant.id}:`, err);
      resultados.push({ plantId: plant.id, ok: false, erro: err.message });
    }
  }

  return { dia: dia.toISOString().slice(0, 10), total: plants.length, resultados };
}

export async function fecharMesAnterior() {
  const hoje = new Date();
  // Mes anterior (relativo a hoje em UTC)
  const anoMesAnterior = hoje.getUTCMonth() === 0
    ? { ano: hoje.getUTCFullYear() - 1, mes: 12 }
    : { ano: hoje.getUTCFullYear(), mes: hoje.getUTCMonth() };

  const plants = await prisma.solarPlant.findMany({
    where: { ativo: true },
    select: { id: true, tenantId: true },
  });

  for (const plant of plants) {
    try {
      await upsertAgregadoMensalDePlanta({
        tenantId: plant.tenantId, plantId: plant.id,
        ano: anoMesAnterior.ano, mes: anoMesAnterior.mes,
      });
    } catch (err) {
      console.error(`[SOLAR_AGREGADOS_MES] Falha mes ${anoMesAnterior.ano}-${anoMesAnterior.mes} planta ${plant.id}:`, err);
    }
  }

  return { ano: anoMesAnterior.ano, mes: anoMesAnterior.mes, total: plants.length };
}
