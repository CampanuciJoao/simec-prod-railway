// Backfill historico Solar — busca geracao diaria dos ultimos N dias
// nos adapters e upserta em solar_agregados_diarios (por planta).
//
// Cada adapter implementa fetchHistoricalDaily({ inverter, inicio, fim })
// retornando array de { data: Date (00:00 UTC), kwhGerado: number }.
//
// O service itera por janelas (cada adapter respeita seu proprio limite
// da API) e consolida por planta. Se a planta tem N inverters, a geracao
// de cada dia e a SOMA de todos os inverters daquele dia.

import prisma from '../prismaService.js';
import { getAdapter } from './adapters/index.js';
import { decryptCredential } from './solarCrypto.js';

/**
 * Busca historico diario de UM inverter e upserta em solar_agregados_diarios
 * da planta a qual ele pertence. Idempotente: se ja existe linha pro dia +
 * planta, soma a geracao desse inverter ao total existente.
 *
 * @param {string} inverterId
 * @param {number} diasAtras  — default 365
 * @returns {Promise<{ok, diasInseridos, diasAtualizados, periodo, erro?}>}
 */
export async function backfillInversor(inverterId, diasAtras = 365) {
  const inverter = await prisma.solarInverter.findUnique({
    where: { id: inverterId },
    select: {
      id: true, tenantId: true, plantId: true, provider: true,
      inverterSn: true, apiBase: true, credentialCrypt: true, ativo: true,
    },
  });
  if (!inverter) return { ok: false, erro: 'inverter nao encontrado' };
  if (!inverter.ativo) return { ok: false, erro: 'inverter inativo' };

  const credential = decryptCredential(inverter.credentialCrypt);
  if (!credential) return { ok: false, erro: 'credencial invalida/vazia' };

  const adapter = getAdapter(inverter.provider);
  if (typeof adapter.fetchHistoricalDaily !== 'function') {
    return {
      ok: false,
      erro: `Adapter ${inverter.provider} ainda nao implementa fetchHistoricalDaily`,
    };
  }

  const fim = new Date();
  fim.setUTCHours(0, 0, 0, 0);
  const inicio = new Date(fim);
  inicio.setUTCDate(inicio.getUTCDate() - diasAtras);

  const inverterComCred = {
    id: inverter.id,
    inverterSn: inverter.inverterSn,
    apiBase: inverter.apiBase,
    credential,
    plantId: inverter.plantId,
    tenantId: inverter.tenantId,
  };

  let dados;
  try {
    dados = await adapter.fetchHistoricalDaily({
      inverter: inverterComCred,
      inicio,
      fim,
    });
  } catch (err) {
    return { ok: false, erro: `fetchHistoricalDaily falhou: ${err.message}` };
  }

  if (!Array.isArray(dados)) {
    return { ok: false, erro: 'adapter nao retornou array' };
  }

  // Escreve POR inverter via upsert (unique em inverterId+dia). Idempotente
  // de verdade: rodar N vezes nao infla numeros. Plantas com multiplos
  // inverters nao se sobrescrevem porque cada um tem sua linha propria.
  let diasInseridos = 0;
  let diasAtualizados = 0;
  const diasAfetados = new Set();
  for (const d of dados) {
    if (!d?.data || d.kwhGerado == null || !Number.isFinite(d.kwhGerado)) continue;
    const dia = new Date(d.data);
    dia.setUTCHours(0, 0, 0, 0);
    diasAfetados.add(dia.toISOString().slice(0, 10));

    const r = await prisma.solarAgregadoDiarioInverter.upsert({
      where: { inverterId_dia: { inverterId: inverter.id, dia } },
      create: {
        tenantId: inverter.tenantId,
        plantId: inverter.plantId,
        inverterId: inverter.id,
        dia,
        kwhGerado: d.kwhGerado,
      },
      update: { kwhGerado: d.kwhGerado }, // SOBRESCREVE idempotente
    });
    // Nao da pra saber facilmente se foi insert ou update do upsert do Prisma
    // sem outra query, entao usamos diasAfetados pra totais.
    if (r) diasAfetados.add(dia.toISOString().slice(0, 10));
  }

  // Apos backfill do inverter, recalcula agregados da planta (soma dos
  // inverters para cada dia afetado).
  await recalcularAgregadosDaPlanta(
    inverter.plantId,
    inverter.tenantId,
    Array.from(diasAfetados).map((s) => new Date(s + 'T00:00:00Z')),
  );

  return {
    ok: true,
    diasAfetados: diasAfetados.size,
    totalDias: dados.length,
    periodo: {
      inicio: inicio.toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10),
    },
  };
}

/**
 * Recalcula solar_agregados_diarios (nivel PLANTA) somando os
 * solar_agregados_diarios_inverter (nivel INVERTER) de cada dia dado.
 * Idempotente: pode rodar N vezes, sempre reflete o estado atual.
 */
export async function recalcularAgregadosDaPlanta(plantId, tenantId, dias) {
  if (!dias || dias.length === 0) return { diasRecalculados: 0 };
  let recalculados = 0;
  for (const dia of dias) {
    dia.setUTCHours(0, 0, 0, 0);
    const soma = await prisma.solarAgregadoDiarioInverter.aggregate({
      where: { tenantId, plantId, dia },
      _sum: { kwhGerado: true },
    });
    const kwhGerado = soma._sum.kwhGerado ?? 0;

    const existente = await prisma.solarAgregadoDiario.findFirst({
      where: { tenantId, plantId, dia },
    });
    if (existente) {
      await prisma.solarAgregadoDiario.update({
        where: { id: existente.id },
        data: { kwhGerado },
      });
    } else {
      await prisma.solarAgregadoDiario.create({
        data: { tenantId, plantId, dia, kwhGerado },
      });
    }
    recalculados++;
  }
  return { diasRecalculados: recalculados };
}

/**
 * Apaga todos os agregados diarios de uma PLANTA (inclusive mes e insights
 * derivados — regera no proximo backfill). Usado pra limpar dados sujos
 * de execucoes previas do backfill que somavam ao inves de sobrescrever.
 */
export async function purgarAgregadosDaPlanta(plantId, tenantId) {
  const porInverter = await prisma.solarAgregadoDiarioInverter.deleteMany({
    where: { tenantId, plantId },
  });
  const diarios = await prisma.solarAgregadoDiario.deleteMany({
    where: { tenantId, plantId },
  });
  const mensais = await prisma.solarAgregadoMensal.deleteMany({
    where: { tenantId, plantId },
  });
  return {
    ok: true,
    porInverterDeletados: porInverter.count,
    diariosDeletados: diarios.count,
    mensaisDeletados: mensais.count,
  };
}
