// Poller generico Solar — roda a cada 60s pelo cron 'solar-poll'.
// Para cada SolarInverter ativo:
//   1. Descriptografa credencial
//   2. Carrega adapter do provider
//   3. adapter.fetchSnapshot(inverter) devolve dados normalizados
//   4. Persiste 1 SolarSnapshot
//   5. Delega pra solarAlertRepository processar eventos (queda, SoC, etc)
//
// Erros por inverter sao isolados. Snapshots sao gravados vinculados ao
// inverter especifico; agregacao por planta e feita na UI (soma dos
// inverters ativos).

import prisma from '../prismaService.js';
import { getAdapter } from './adapters/index.js';
import { decryptCredential } from './solarCrypto.js';
import { processarEventosSolar } from './solarAlertRepository.js';

async function coletarInverter(inverter) {
  const adapter = getAdapter(inverter.provider);
  const credential = decryptCredential(inverter.credentialCrypt);
  if (!credential) {
    throw new Error(`Credencial vazia/invalida para inverter ${inverter.id}`);
  }

  const dados = await adapter.fetchSnapshot({
    inverterSn: inverter.inverterSn,
    apiBase: inverter.apiBase,
    credential,
    modeloInversor: inverter.modeloInversor,
  });

  const snapshot = await prisma.solarSnapshot.create({
    data: {
      tenantId: inverter.tenantId,
      plantId: inverter.plantId,
      inverterId: inverter.id,
      // Bateria / grid
      soc: dados.soc ?? null,
      batChargePower: dados.batChargePower ?? null,
      batDischargePower: dados.batDischargePower ?? null,
      feedinPower: dados.feedinPower ?? null,
      gridConsumptionPower: dados.gridConsumptionPower ?? null,
      epsPower: dados.epsPower ?? null,
      runningState: typeof dados.runningState === 'number' ? dados.runningState : null,
      currentFault: dados.currentFault ?? null,
      // Geracao
      powerKw: dados.powerKw ?? null,
      generationKwhDay: dados.generationKwhDay ?? null,
      generationKwhMonth: dados.generationKwhMonth ?? null,
      generationKwhTotal: dados.generationKwhTotal ?? null,
      // Diagnostico
      ambientTempC: dados.ambientTempC ?? null,
      inverterTempC: dados.inverterTempC ?? null,
      detalhesJson: dados.detalhes || null,
      rawJson: dados.rawPayload ? JSON.stringify(dados.rawPayload).slice(0, 10000) : null,
    },
  });

  await processarEventosSolar({ inverter, snapshot });
  return { inverterId: inverter.id, snapshotId: snapshot.id };
}

export async function coletarTodosInvertersSolar() {
  const inverters = await prisma.solarInverter.findMany({
    where: { ativo: true, plant: { ativo: true } },
    include: { plant: { select: { ativo: true, temBateria: true, tenantId: true } } },
  });

  const resultados = [];
  for (const inv of inverters) {
    if (!inv.plant?.ativo) continue;
    try {
      const r = await coletarInverter(inv);
      resultados.push({ ...r, ok: true });
    } catch (err) {
      console.error(`[SOLAR_POLLER] Falha no inverter ${inv.id} (${inv.provider} SN ${inv.inverterSn}):`, err.message);
      resultados.push({ inverterId: inv.id, ok: false, erro: err.message });
    }
  }

  return { total: inverters.length, resultados };
}
