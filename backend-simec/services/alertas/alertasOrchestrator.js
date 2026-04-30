import {
  gerarAlertasManutencao,
  gerarAlertasSeguro,
  gerarAlertasContrato,
  gerarAlertasRecomendacao,
} from './index.js';

import { gerarInsightsInteligentes } from './proactivityAgent.js';
import { onAlertasProcessados } from './alertasEventService.js';

const ETAPA_TIMEOUT_MS = 90_000;

function withTimeout(promise, ms, nome) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Etapa "${nome}" excedeu ${ms / 1000}s`)),
        ms
      )
    ),
  ]);
}

/**
 * Executa uma etapa com tratamento de erro padronizado e timeout de 90s.
 */
async function executarEtapa(nome, fn) {
  try {
    const result = await withTimeout(fn(), ETAPA_TIMEOUT_MS, nome);

    const total =
      typeof result === 'number'
        ? result
        : Number(result?.total || 0);

    const tenantsAfetados = Array.isArray(result?.tenantsAfetados)
      ? result.tenantsAfetados
      : [];

    console.log(`[ALERTAS] ${nome} concluído | total=${total}`);

    return {
      ok: true,
      total,
      tenantsAfetados,
      erro: null,
    };
  } catch (error) {
    console.error(`[ALERTAS] Erro em ${nome}:`, error);

    return {
      ok: false,
      total: 0,
      tenantsAfetados: [],
      erro: error,
    };
  }
}

function coletarTenantsUnicos(...results) {
  const tenantsSet = new Set();

  for (const result of results) {
    if (Array.isArray(result?.tenantsAfetados)) {
      result.tenantsAfetados.forEach((tenantId) =>
        tenantsSet.add(String(tenantId))
      );
    }
  }

  return [...tenantsSet];
}

/**
 * Orquestrador principal — todos os geradores rodam em paralelo.
 * `executarEtapa` já captura erros internamente, então Promise.all nunca rejeita.
 */
export async function processarAlertasEEnviarNotificacoes() {
  console.log('[ALERTAS] Iniciando processamento paralelo...');

  const [
    manutencoesResult,
    segurosResult,
    contratosResult,
    recomendacoesResult,
    insightsResult,
  ] = await Promise.all([
    executarEtapa('manutencoes', gerarAlertasManutencao),
    executarEtapa('seguros', gerarAlertasSeguro),
    executarEtapa('contratos', gerarAlertasContrato),
    executarEtapa('recomendacoes', gerarAlertasRecomendacao),
    executarEtapa('insights_ia', gerarInsightsInteligentes),
  ]);

  const manutencoes = manutencoesResult.total;
  const seguros = segurosResult.total;
  const contratos = contratosResult.total;
  const recomendacoes = recomendacoesResult.total;
  const insights = insightsResult.total;

  const ok =
    manutencoesResult.ok &&
    segurosResult.ok &&
    contratosResult.ok &&
    recomendacoesResult.ok &&
    insightsResult.ok;

  const totalGeral =
    manutencoes + seguros + contratos + recomendacoes + insights;

  const tenantsAfetados = coletarTenantsUnicos(
    manutencoesResult,
    segurosResult,
    contratosResult,
    recomendacoesResult,
    insightsResult
  );

  if (tenantsAfetados.length > 0) {
    await onAlertasProcessados({
      tenantsAfetados,
    });
  }

  console.log(
    `[ALERTAS] Finalizado | manutencoes=${manutencoes} | seguros=${seguros} | contratos=${contratos} | recomendacoes=${recomendacoes} | insights_ia=${insights} | total=${totalGeral} | tenantsAfetados=${tenantsAfetados.length} | ok=${ok}`
  );

  return {
    ok,
    total: totalGeral,
    manutencoes,
    seguros,
    contratos,
    recomendacoes,
    insights,
    tenantsAfetados,
    detalhes: {
      manutencoes: {
        ok: manutencoesResult.ok,
        total: manutencoesResult.total,
        erro: manutencoesResult.erro?.message || null,
      },
      seguros: {
        ok: segurosResult.ok,
        total: segurosResult.total,
        erro: segurosResult.erro?.message || null,
      },
      contratos: {
        ok: contratosResult.ok,
        total: contratosResult.total,
        erro: contratosResult.erro?.message || null,
      },
      recomendacoes: {
        ok: recomendacoesResult.ok,
        total: recomendacoesResult.total,
        erro: recomendacoesResult.erro?.message || null,
      },
      insights_ia: {
        ok: insightsResult.ok,
        total: insightsResult.total,
        erro: insightsResult.erro?.message || null,
      },
    },
  };
}

export default processarAlertasEEnviarNotificacoes;