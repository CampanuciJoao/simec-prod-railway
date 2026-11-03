// Poller FoxESS: executado a cada 60s pelo cron 'foxess-poll' do worker.
// Para cada site ativo:
//   1. Descriptografa API key
//   2. Chama /op/v1/device/real/query pro SN do inversor + baterias
//   3. Persiste 1 FoxessSnapshot com soc / batPower / epsPower / runningState
//   4. Chama processarEventosFoxess() pra fechar/abrir quedas + emitir alertas
//
// Erros por site sao isolados: um site com credencial errada nao afeta
// outros. Rate limit do FoxESS (1440/dia por inversor) e respeitado
// porque so chamamos 1x por minuto por site.

import prisma from '../prismaService.js';
import { queryRealTime, toVariablesMap } from './foxessClient.js';
import { decryptApiKey } from './foxessCrypto.js';
import { processarEventosFoxess } from './foxessAlertRepository.js';

// Variaveis que a FoxESS retorna que nos interessam. Omitir `variables`
// na chamada traria tudo — pedimos explicitamente so o que usamos pra
// payload menor e menos chance de bater num campo que a FoxESS renomeie.
const VARIAVEIS = [
  'SoC',
  'batChargePower',
  'batDischargePower',
  'feedinPower',
  'gridConsumptionPower',
  'epsPower',
  'runningState',
];

// Running state do FoxESS: 163 = on-grid, 164 = off-grid/EPS, 165 = fault.
// Snapshot sem runningState tratamos como on-grid (nao gera queda).
const RUNNING_STATE_OFFGRID = 164;

async function coletarSite(site) {
  const apiKey = decryptApiKey(site.apiKeyCrypt);
  const snsAlvo = [site.inverterSn, ...(site.bateriaSns || [])];

  const resultado = await queryRealTime({
    apiBase: site.apiBase,
    apiKey,
    sns: snsAlvo,
    variables: VARIAVEIS,
  });

  // Extrai variaveis do inversor (SN principal). As baterias (quando SN
  // separado) retornam seus proprios SoC — guardamos no bateriasJson.
  const porSn = new Map((resultado || []).map((d) => [d?.deviceSN, toVariablesMap(d)]));
  const inversor = porSn.get(site.inverterSn) || {};

  const bateriasJson = (site.bateriaSns || []).map((sn) => {
    const v = porSn.get(sn) || {};
    return {
      sn,
      soc: v.SoC ?? null,
      chargePower: v.batChargePower ?? null,
      dischargePower: v.batDischargePower ?? null,
    };
  });

  const snapshot = await prisma.foxessSnapshot.create({
    data: {
      tenantId: site.tenantId,
      siteId: site.id,
      soc: inversor.SoC ?? null,
      batChargePower: inversor.batChargePower ?? null,
      batDischargePower: inversor.batDischargePower ?? null,
      feedinPower: inversor.feedinPower ?? null,
      gridConsumptionPower: inversor.gridConsumptionPower ?? null,
      epsPower: inversor.epsPower ?? null,
      runningState: typeof inversor.runningState === 'number' ? inversor.runningState : null,
      bateriasJson: bateriasJson.length > 0 ? bateriasJson : null,
      rawJson: JSON.stringify(resultado || []).slice(0, 10000), // teto defensivo
    },
  });

  // Delega pra camada de alerta decidir: abriu uma queda? fechou? SoC
  // atingiu threshold? Idempotente — rodar 2x nao duplica alertas.
  await processarEventosFoxess({ site, snapshot });

  return { siteId: site.id, snapshotId: snapshot.id };
}

/**
 * Entrada principal do cron. Itera todos os sites ativos de todos os
 * tenants e coleta snapshot. Erros por site sao logados mas nao
 * interrompem os outros.
 */
export async function coletarTodosSitesFoxess() {
  const sites = await prisma.foxessSite.findMany({
    where: { ativo: true },
    include: { tenant: { select: { ativo: true } } },
  });

  const resultados = [];
  for (const site of sites) {
    if (!site.tenant?.ativo) continue; // tenant inativo — nao coletar
    try {
      const r = await coletarSite(site);
      resultados.push({ ...r, ok: true });
    } catch (err) {
      console.error(`[FOXESS_POLLER] Falha no site ${site.id} (${site.nome}):`, err.message);
      resultados.push({ siteId: site.id, ok: false, erro: err.message });
    }
  }

  return { total: sites.length, resultados };
}

export const _internalForTest = { RUNNING_STATE_OFFGRID };
