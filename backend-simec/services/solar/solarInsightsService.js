// Alertas inteligentes Solar — Fase 5.
//
// Roda diariamente (06:00 UTC) depois dos agregados fecharem. 5 regras:
//
//   1. Geracao baixa: kwhGerado de ontem < 50% da media dos ultimos 14
//      dias com geracao > 0. Possivel sujeira em painel, sombreamento
//      novo, ou perda de string.
//   2. Pico abaixo da capacidade: picosKw < 70% de capacidadeKwp por
//      3 dias consecutivos. Painel degradado, inversor com problema.
//   3. Inversor derated: runningState 128 ou 33024 (derated) por mais
//      de 1h ao longo do dia. Super aquecimento, grid instavel.
//   4. Temperatura alta: inverterTempC > 60°C em >20% dos snapshots do
//      dia. Ventilacao obstruida.
//   5. SoC medio baixo (so plantas com bateria): SoC medio dos ultimos
//      7 dias < 40%. Bateria sub-dimensionada ou autonomia comprometida.
//
// Cada regra gera alerta MEDIA que entra no sino SIMEC e dispara Telegram.
// Dedupe por alertaId (so cria se nao existe o mesmo id ativo).

import prisma from '../prismaService.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';

const BAIXA_GERACAO_RATIO = 0.5;
const PICO_ABAIXO_RATIO   = 0.7;
const DIAS_PICO_CONSECUTIVO = 3;
const TEMPERATURA_LIMITE_C = 60;
const TEMP_RATIO_LIMITE    = 0.2; // 20% dos snapshots acima do limite
const SOC_MEDIO_LIMITE     = 40;
const DIAS_SOC             = 7;
const DIAS_BASELINE        = 14;
const DERATED_STATES       = [128, 33024];
const MINUTOS_DERATED_LIMITE = 60;

function diaX(offset = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function criarAlertaSePrecisa({ tenantId, id, titulo, subtitulo, prioridade, tipoEvento }) {
  const existe = await prisma.alerta.findUnique({
    where: { tenantId_id: { tenantId, id } }, select: { id: true },
  });
  if (existe) return false;
  await prisma.alerta.create({
    data: {
      id, tenantId, titulo, subtitulo, data: new Date(),
      prioridade, tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA, tipoEvento,
    },
  });
  return true;
}

async function regraGeracaoBaixa({ tenantId, plant }) {
  const ontem = diaX(-1);
  const inicioBaseline = diaX(-1 - DIAS_BASELINE);

  const [ontemAg, baseline] = await Promise.all([
    prisma.solarAgregadoDiario.findUnique({
      where: { tenantId_plantId_dia: { tenantId, plantId: plant.id, dia: ontem } },
      select: { kwhGerado: true },
    }),
    prisma.solarAgregadoDiario.findMany({
      where: { tenantId, plantId: plant.id, dia: { gte: inicioBaseline, lt: ontem } },
      select: { kwhGerado: true },
    }),
  ]);

  if (!ontemAg || ontemAg.kwhGerado == null) return null;
  const comGeracao = baseline.filter((d) => (d.kwhGerado || 0) > 0);
  if (comGeracao.length < 5) return null; // historico insuficiente
  const media = comGeracao.reduce((a, b) => a + b.kwhGerado, 0) / comGeracao.length;
  if (media === 0) return null;
  const ratio = ontemAg.kwhGerado / media;
  if (ratio >= BAIXA_GERACAO_RATIO) return null;

  const id = buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, 'geracao-baixa', `${plant.id}-${ontem.toISOString().slice(0,10)}`);
  return criarAlertaSePrecisa({
    tenantId, id,
    titulo: `${plant.nome}: gerou ${Math.round(ontemAg.kwhGerado)} kWh (${Math.round(ratio*100)}% da media)`,
    subtitulo: `Media dos ultimos ${DIAS_BASELINE} dias com geracao: ${Math.round(media)} kWh. Possivel sujeira em paineis, sombreamento novo ou perda de string.`,
    prioridade: ALERT_PRIORIDADES.MEDIA,
    tipoEvento: ALERT_EVENTOS.SOLAR_GERACAO_BAIXA,
  });
}

async function regraPicoAbaixoCapacidade({ tenantId, plant }) {
  if (!plant.capacidadeKwp) return null;
  const inicio = diaX(-DIAS_PICO_CONSECUTIVO);
  const ultimos = await prisma.solarAgregadoDiario.findMany({
    where: { tenantId, plantId: plant.id, dia: { gte: inicio, lt: diaX(0) } },
    orderBy: { dia: 'asc' },
    select: { dia: true, picosKw: true },
  });
  if (ultimos.length < DIAS_PICO_CONSECUTIVO) return null;
  const limite = plant.capacidadeKwp * PICO_ABAIXO_RATIO;
  if (!ultimos.every((d) => d.picosKw != null && d.picosKw < limite)) return null;

  const id = buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, 'pico-abaixo', plant.id);
  const picoMedio = ultimos.reduce((a, b) => a + b.picosKw, 0) / ultimos.length;
  return criarAlertaSePrecisa({
    tenantId, id,
    titulo: `${plant.nome}: pico abaixo da capacidade ha ${DIAS_PICO_CONSECUTIVO} dias`,
    subtitulo: `Pico medio ${picoMedio.toFixed(1)} kW vs capacidade ${plant.capacidadeKwp} kWp (${Math.round(picoMedio/plant.capacidadeKwp*100)}%). Degradacao de painel, sujeira ou inversor parcialmente offline.`,
    prioridade: ALERT_PRIORIDADES.MEDIA,
    tipoEvento: ALERT_EVENTOS.SOLAR_PICO_ABAIXO_CAPACIDADE,
  });
}

async function regraTemperaturaAlta({ tenantId, plant }) {
  const ontem = diaX(-1);
  const fim = diaX(0);
  const snapshots = await prisma.solarSnapshot.findMany({
    where: { tenantId, plantId: plant.id, capturedAt: { gte: ontem, lt: fim } },
    select: { inverterTempC: true },
  });
  const comTemp = snapshots.filter((s) => s.inverterTempC != null);
  if (comTemp.length < 20) return null; // dados insuficientes
  const acima = comTemp.filter((s) => s.inverterTempC > TEMPERATURA_LIMITE_C).length;
  const ratio = acima / comTemp.length;
  if (ratio < TEMP_RATIO_LIMITE) return null;

  const id = buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, 'temp-alta', `${plant.id}-${ontem.toISOString().slice(0,10)}`);
  return criarAlertaSePrecisa({
    tenantId, id,
    titulo: `${plant.nome}: inversor acima de ${TEMPERATURA_LIMITE_C}°C em ${Math.round(ratio*100)}% do dia`,
    subtitulo: `${acima}/${comTemp.length} leituras acima do limite. Verificar ventilacao, local da instalacao ou carga continua.`,
    prioridade: ALERT_PRIORIDADES.MEDIA,
    tipoEvento: ALERT_EVENTOS.SOLAR_TEMPERATURA_ALTA,
  });
}

async function regraInversorDerated({ tenantId, plant }) {
  const ontem = diaX(-1);
  const fim = diaX(0);
  const snapshots = await prisma.solarSnapshot.findMany({
    where: {
      tenantId, plantId: plant.id,
      capturedAt: { gte: ontem, lt: fim },
      runningState: { in: DERATED_STATES },
    },
    select: { capturedAt: true },
    orderBy: { capturedAt: 'asc' },
  });
  if (snapshots.length < 2) return null;
  // Estimativa de minutos derated: numero de snapshots * intervalo medio (60s)
  const minutosEstimados = snapshots.length;
  if (minutosEstimados < MINUTOS_DERATED_LIMITE) return null;

  const id = buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, 'derated', `${plant.id}-${ontem.toISOString().slice(0,10)}`);
  return criarAlertaSePrecisa({
    tenantId, id,
    titulo: `${plant.nome}: inversor operou em modo derated por ~${minutosEstimados} min ontem`,
    subtitulo: `Modo derated indica que o inversor reduziu potencia por temperatura, tensao de rede ou limite de inject. Investigar causa raiz.`,
    prioridade: ALERT_PRIORIDADES.MEDIA,
    tipoEvento: ALERT_EVENTOS.SOLAR_INVERSOR_DERATED,
  });
}

async function regraSocMedioBaixo({ tenantId, plant }) {
  if (!plant.temBateria) return null;
  const inicio = diaX(-DIAS_SOC);
  const fim = diaX(0);
  const snapshots = await prisma.solarSnapshot.findMany({
    where: {
      tenantId, plantId: plant.id,
      capturedAt: { gte: inicio, lt: fim },
      soc: { not: null },
    },
    select: { soc: true },
  });
  if (snapshots.length < 100) return null;
  const media = snapshots.reduce((a, b) => a + b.soc, 0) / snapshots.length;
  if (media >= SOC_MEDIO_LIMITE) return null;

  const id = buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, 'soc-medio-baixo', plant.id);
  return criarAlertaSePrecisa({
    tenantId, id,
    titulo: `${plant.nome}: SoC medio ${media.toFixed(0)}% nos ultimos ${DIAS_SOC} dias`,
    subtitulo: `Bateria operando consistentemente abaixo de ${SOC_MEDIO_LIMITE}%. Possivel sub-dimensionamento ou demanda alem do projeto.`,
    prioridade: ALERT_PRIORIDADES.MEDIA,
    tipoEvento: ALERT_EVENTOS.SOLAR_SOC_MEDIO_BAIXO,
  });
}

export async function processarInsightsSolar() {
  const plants = await prisma.solarPlant.findMany({
    where: { ativo: true },
    select: { id: true, tenantId: true, nome: true, capacidadeKwp: true, temBateria: true },
  });

  const resultados = [];
  const tenantsAfetados = new Set();
  for (const plant of plants) {
    const tenantId = plant.tenantId;
    const regras = [
      regraGeracaoBaixa, regraPicoAbaixoCapacidade, regraTemperaturaAlta,
      regraInversorDerated, regraSocMedioBaixo,
    ];
    let criadas = 0;
    for (const regra of regras) {
      try {
        const criou = await regra({ tenantId, plant });
        if (criou) criadas++;
      } catch (err) {
        console.warn(`[SOLAR_INSIGHTS] Regra ${regra.name} falhou pra planta ${plant.id}:`, err.message);
      }
    }
    if (criadas > 0) tenantsAfetados.add(tenantId);
    resultados.push({ plantId: plant.id, criadas });
  }

  for (const tenantId of tenantsAfetados) {
    publicarContagemAlertasParaTenant({ tenantId }).catch(() => {});
  }

  return { total: plants.length, resultados };
}
