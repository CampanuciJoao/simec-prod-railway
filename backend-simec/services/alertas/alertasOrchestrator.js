import {
  gerarAlertasManutencao,
  gerarAlertasSeguro,
  gerarAlertasContrato,
  gerarAlertasRecomendacao,
  gerarAlertasOsCorretiva,
  gerarAlertasControleQualidade,
} from './index.js';

import { gerarInsightsInteligentes } from './proactivityAgent.js';
import { onAlertasProcessados } from './alertasEventService.js';
import { dispararNotificacoesTelegram } from '../telegram/telegramAlertService.js';

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

    console.log(`[ALERTAS] ${nome} concluido | total=${total}`);

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

export async function processarAlertasEEnviarNotificacoes() {
  console.log('[ALERTAS] Iniciando processamento paralelo...');

  const [
    manutencoesResult,
    segurosResult,
    contratosResult,
    recomendacoesResult,
    osCorretivaResult,
    controleQualidadeResult,
    insightsResult,
  ] = await Promise.all([
    executarEtapa('manutencoes', gerarAlertasManutencao),
    executarEtapa('seguros', gerarAlertasSeguro),
    executarEtapa('contratos', gerarAlertasContrato),
    executarEtapa('recomendacoes', gerarAlertasRecomendacao),
    executarEtapa('os_corretiva', gerarAlertasOsCorretiva),
    executarEtapa('controle_qualidade', gerarAlertasControleQualidade),
    executarEtapa('insights_ia', gerarInsightsInteligentes),
  ]);

  const manutencoes = manutencoesResult.total;
  const seguros = segurosResult.total;
  const contratos = contratosResult.total;
  const recomendacoes = recomendacoesResult.total;
  const osCorretiva = osCorretivaResult.total;
  const controleQualidade = controleQualidadeResult.total;
  const insights = insightsResult.total;

  const ok =
    manutencoesResult.ok &&
    segurosResult.ok &&
    contratosResult.ok &&
    recomendacoesResult.ok &&
    osCorretivaResult.ok &&
    controleQualidadeResult.ok &&
    insightsResult.ok;

  const totalGeral =
    manutencoes + seguros + contratos + recomendacoes + osCorretiva + controleQualidade + insights;

  const tenantsAfetados = coletarTenantsUnicos(
    manutencoesResult,
    segurosResult,
    contratosResult,
    recomendacoesResult,
    osCorretivaResult,
    controleQualidadeResult,
    insightsResult
  );

  if (tenantsAfetados.length > 0) {
    await Promise.allSettled([
      onAlertasProcessados({ tenantsAfetados }),
      dispararNotificacoesTelegram(tenantsAfetados),
    ]);
  }

  console.log(
    `[ALERTAS] Finalizado | manutencoes=${manutencoes} | seguros=${seguros} | contratos=${contratos} | recomendacoes=${recomendacoes} | os_corretiva=${osCorretiva} | controle_qualidade=${controleQualidade} | insights_ia=${insights} | total=${totalGeral} | tenantsAfetados=${tenantsAfetados.length} | ok=${ok}`
  );

  return {
    ok,
    total: totalGeral,
    manutencoes,
    seguros,
    contratos,
    recomendacoes,
    osCorretiva,
    controleQualidade,
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
      os_corretiva: {
        ok: osCorretivaResult.ok,
        total: osCorretivaResult.total,
        erro: osCorretivaResult.erro?.message || null,
      },
      controle_qualidade: {
        ok: controleQualidadeResult.ok,
        total: controleQualidadeResult.total,
        erro: controleQualidadeResult.erro?.message || null,
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