import { gerarAlertasManutencao } from './manutencao/index.js';
import { gerarAlertasSeguro } from './seguro/index.js';
import { gerarAlertasContrato } from './contrato/index.js';
import { gerarAlertasRecomendacao } from './recomendacao/index.js';

async function executarEtapa(nome, fn) {
  try {
    const total = await fn();

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

  if (global.io) {
    global.io.emit('atualizar-alertas');
    console.log('📢 WebSockets: Notificando navegadores em tempo real!');
  }

  console.log(
    `[ALERTAS] Finalizado | manutencoes=${manutencoes} | seguros=${seguros} | contratos=${contratos} | recomendacoes=${recomendacoes} | ok=${ok}`
  );

  return {
    ok,
    manutencoes,
    seguros,
    contratos,
    recomendacoes,
    detalhes: {
      manutencoes: {
        ok: manutencoesResult.ok,
      },
      seguros: {
        ok: segurosResult.ok,
      },
      contratos: {
        ok: contratosResult.ok,
      },
      recomendacoes: {
        ok: recomendacoesResult.ok,
      },
    },
  };
}