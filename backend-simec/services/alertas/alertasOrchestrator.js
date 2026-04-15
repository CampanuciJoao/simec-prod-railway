import {
  gerarAlertasManutencao,
  gerarAlertasSeguro,
  gerarAlertasContrato,
  gerarAlertasRecomendacao,
} from './index.js';

import { onAlertasProcessados } from './alertasEventService.js';

/**
 * Executa uma etapa com tratamento de erro padronizado
 */
async function executarEtapa(nome, fn) {
  try {
    const result = await fn();

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
 * Orquestrador principal
 */
export async function processarAlertasEEnviarNotificacoes() {
  console.log('[ALERTAS] Iniciando processamento...');

  const manutencoesResult = await executarEtapa(
    'manutencoes',
    gerarAlertasManutencao
  );

  const segurosResult = await executarEtapa(
    'seguros',
    gerarAlertasSeguro
  );

  const contratosResult = await executarEtapa(
    'contratos',
    gerarAlertasContrato
  );

  const recomendacoesResult = await executarEtapa(
    'recomendacoes',
    gerarAlertasRecomendacao
  );

  const manutencoes = manutencoesResult.total;
  const seguros = segurosResult.total;
  const contratos = contratosResult.total;
  const recomendacoes = recomendacoesResult.total;

  const ok =
    manutencoesResult.ok &&
    segurosResult.ok &&
    contratosResult.ok &&
    recomendacoesResult.ok;

  const totalGeral =
    manutencoes + seguros + contratos + recomendacoes;

  const tenantsAfetados = coletarTenantsUnicos(
    manutencoesResult,
    segurosResult,
    contratosResult,
    recomendacoesResult
  );

  if (tenantsAfetados.length > 0) {
    await onAlertasProcessados({
      tenantsAfetados,
    });
  }

  console.log(
    `[ALERTAS] Finalizado | manutencoes=${manutencoes} | seguros=${seguros} | contratos=${contratos} | recomendacoes=${recomendacoes} | total=${totalGeral} | tenantsAfetados=${tenantsAfetados.length} | ok=${ok}`
  );

  return {
    ok,
    total: totalGeral,
    manutencoes,
    seguros,
    contratos,
    recomendacoes,
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
    },
  };
}

export default processarAlertasEEnviarNotificacoes;