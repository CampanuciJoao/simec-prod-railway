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

// Variaveis que a FoxESS devolve que nos interessam. O H3 PRO (unico
// modelo validado ate agora) NAO expoe 'SoC' generico — expoe 'SoC_1'
// e 'SoC_2' (uma por bateria). Pedimos as 2 e consolidamos pelo menor
// (pior caso pra alerta).
//
// Outras variaveis uteis descobertas no diagnostico (scripts/foxessListarVariaveis):
//   SOH_1, SOH_2            -> saude fisica das baterias (0-100%)
//   batTemperature_1/_2     -> temperatura de cada bateria
//   invBatPower_1/_2        -> potencia por bateria (negativo = carga, positivo = descarga)
//   ambientTemperation      -> temp ambiente do inversor
//   invTemperation          -> temp interna do inversor
//   remainCapacity_1/_2     -> capacidade restante em Ah
const VARIAVEIS = [
  'SoC_1', 'SoC_2',
  'SOH_1', 'SOH_2',
  'batTemperature_1', 'batTemperature_2',
  'invBatPower_1', 'invBatPower_2',
  'batChargePower',
  'batDischargePower',
  'feedinPower',
  'gridConsumptionPower',
  'epsPower',
  'runningState',
  'currentFault',
  'ambientTemperation',
  'invTemperation',
];

const RUNNING_STATE_OFFGRID = 164;

// SoC agregado = minimo entre as baterias. Conservador: um banco com
// 1 bateria em 10% e outra em 80% ainda e um banco em risco — alerta
// pela pior.
function socAgregado(v) {
  const s1 = typeof v.SoC_1 === 'number' ? v.SoC_1 : null;
  const s2 = typeof v.SoC_2 === 'number' ? v.SoC_2 : null;
  if (s1 == null && s2 == null) return null;
  if (s1 == null) return s2;
  if (s2 == null) return s1;
  return Math.min(s1, s2);
}

async function coletarSite(site) {
  const apiKey = decryptApiKey(site.apiKeyCrypt);

  // Consulta so o SN do inversor — H3 PRO devolve dados das baterias na
  // mesma resposta (SoC_1/_2, batTemperature_1/_2 etc). Chamar com SNs
  // das baterias separados desperdica calls do rate limit e nao traz
  // informacao nova.
  // OBS: nao passamos `variables` — pedir variaveis especificas no H3 PRO
  // (ex: SoC_1, SoC_2) devolve null em todas, enquanto a chamada sem filtro
  // retorna as 90+ variaveis normalmente. Comportamento confirmado via
  // scripts/foxessListarVariaveis.mjs. Payload maior mas tudo bem — so
  // extraimos o que nos interessa abaixo.
  const resultado = await queryRealTime({
    apiBase: site.apiBase,
    apiKey,
    sns: [site.inverterSn],
    // variables: VARIAVEIS,  // DESABILITADO — ver comentario acima
  });

  const device = (resultado || []).find((d) => d?.deviceSN === site.inverterSn) || (resultado || [])[0];
  const v = toVariablesMap(device);

  // Monta detalhes por bateria a partir das variaveis _1/_2 do inversor.
  // Ordem segue site.bateriaSns — primeira entrada recebe os dados _1,
  // segunda os _2.
  const bateriasJson = (site.bateriaSns || []).map((sn, idx) => {
    const suf = idx === 0 ? '_1' : '_2';
    return {
      sn,
      soc:       v[`SoC${suf}`]             ?? null,
      soh:       v[`SOH${suf}`]             ?? null,
      tempC:     v[`batTemperature${suf}`]  ?? null,
      powerKw:   v[`invBatPower${suf}`]     ?? null,
    };
  });

  const snapshot = await prisma.foxessSnapshot.create({
    data: {
      tenantId: site.tenantId,
      siteId: site.id,
      soc: socAgregado(v),
      batChargePower: v.batChargePower ?? null,
      batDischargePower: v.batDischargePower ?? null,
      feedinPower: v.feedinPower ?? null,
      gridConsumptionPower: v.gridConsumptionPower ?? null,
      epsPower: v.epsPower ?? null,
      runningState: typeof v.runningState === 'number' ? v.runningState : null,
      currentFault: typeof v.currentFault === 'string' && v.currentFault.trim() ? v.currentFault : null,
      ambientTempC: typeof v.ambientTemperation === 'number' ? v.ambientTemperation : null,
      inverterTempC: typeof v.invTemperation === 'number' ? v.invTemperation : null,
      bateriasJson: bateriasJson.length > 0 ? bateriasJson : null,
      rawJson: JSON.stringify(resultado || []).slice(0, 10000),
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
