import { gerarAlertasManutencao } from './manutencao/index.js';
import { gerarAlertasSeguro } from './seguro/index.js';
import { gerarAlertasContrato } from './contrato/index.js';
import { gerarAlertasRecomendacao } from './recomendacao/index.js';

async function executarEtapa(nome, fn) {
  try {
    const result = await fn();

    const total =
      typeof result === 'number' ? result : Number(result?.total || 0);

    console.log(`[ALERTAS] ${nome} concluído | total=${total}`);

    return {
      ok: true,
      total,
      erro: null,
    };
  } catch (error) {
    console.error(`[ALERTAS] Erro em ${nome}:`, error);

    return {
      ok: false,
      total: 0,
      erro: error,
    };
  }
}

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

  if (global.io && totalGeral > 0) {
    global.io.emit('atualizar-alertas');
    console.log('📢 WebSockets: Notificando navegadores em tempo real!');
  }

  console.log(
    `[ALERTAS] Finalizado | manutencoes=${manutencoes} | seguros=${seguros} | contratos=${contratos} | recomendacoes=${recomendacoes} | total=${totalGeral} | ok=${ok}`
  );

  return {
    ok,
    total: totalGeral,
    manutencoes,
    seguros,
    contratos,
    recomendacoes,
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