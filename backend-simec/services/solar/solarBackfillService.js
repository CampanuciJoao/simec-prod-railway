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

  let diasInseridos = 0;
  let diasAtualizados = 0;
  for (const d of dados) {
    if (!d?.data || d.kwhGerado == null || !Number.isFinite(d.kwhGerado)) continue;
    const dia = new Date(d.data);
    dia.setUTCHours(0, 0, 0, 0);

    // Upsert com SOMA: se outro inverter da mesma planta ja contribuiu
    // pro mesmo dia, somamos. Senao, cria novo registro.
    const existente = await prisma.solarAgregadoDiario.findFirst({
      where: {
        tenantId: inverter.tenantId,
        plantId: inverter.plantId,
        dia,
      },
    });

    if (existente) {
      await prisma.solarAgregadoDiario.update({
        where: { id: existente.id },
        data: {
          // Soma conservadora: se ja tem valor, adiciona; se null, substitui.
          kwhGerado: (existente.kwhGerado || 0) + d.kwhGerado,
        },
      });
      diasAtualizados++;
    } else {
      await prisma.solarAgregadoDiario.create({
        data: {
          tenantId: inverter.tenantId,
          plantId: inverter.plantId,
          dia,
          kwhGerado: d.kwhGerado,
        },
      });
      diasInseridos++;
    }
  }

  return {
    ok: true,
    diasInseridos,
    diasAtualizados,
    totalDias: dados.length,
    periodo: {
      inicio: inicio.toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10),
    },
  };
}
