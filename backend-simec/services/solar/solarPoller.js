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
import { decryptCredential, encryptCredential } from './solarCrypto.js';
import { processarEventosSolar } from './solarAlertRepository.js';
import * as sungrowAdapter from './adapters/sungrowAdapter.js';

// Se o Sungrow adapter sinalizar TOKEN_EXPIRED, tentamos renovar via
// refresh_token e persistir o novo credential no banco. Depois disso o
// caller repete a chamada original com o novo accessToken.
async function tryRefreshSungrowToken(inverter, credential) {
  if (inverter.provider !== 'sungrow' || !credential.refreshToken) return null;
  try {
    const { accessToken, refreshToken, expiresIn } = await sungrowAdapter.refreshAccessToken({
      apiBase: inverter.apiBase,
      appkey: credential.appkey,
      secretKey: credential.secretKey,
      refreshToken: credential.refreshToken,
    });
    const novoCredential = {
      ...credential,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    await prisma.solarInverter.update({
      where: { id: inverter.id },
      data: { credentialCrypt: encryptCredential(novoCredential) },
    });
    return novoCredential;
  } catch (err) {
    console.warn(`[SOLAR_POLLER] Refresh token Sungrow falhou pro inverter ${inverter.id}:`, err.message);
    return null;
  }
}

async function coletarInverter(inverter) {
  const adapter = getAdapter(inverter.provider);
  let credential = decryptCredential(inverter.credentialCrypt);
  if (!credential) {
    throw new Error(`Credencial vazia/invalida para inverter ${inverter.id}`);
  }

  let dados;
  try {
    dados = await adapter.fetchSnapshot({
      inverterSn: inverter.inverterSn,
      apiBase: inverter.apiBase,
      credential,
      modeloInversor: inverter.modeloInversor,
    });
  } catch (err) {
    // Sungrow: access_token expirou. Tenta refresh + retry 1 vez.
    if (err?.code === 'TOKEN_EXPIRED') {
      const novoCred = await tryRefreshSungrowToken(inverter, credential);
      if (!novoCred) {
        throw new Error(`Sungrow: refresh token falhou e precisa re-autorizar (inverter ${inverter.id})`);
      }
      credential = novoCred;
      dados = await adapter.fetchSnapshot({
        inverterSn: inverter.inverterSn,
        apiBase: inverter.apiBase,
        credential,
        modeloInversor: inverter.modeloInversor,
      });
    } else {
      throw err;
    }
  }

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
