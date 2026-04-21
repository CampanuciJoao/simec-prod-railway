import assert from 'node:assert/strict';

import { calcularScoreRisco } from '../../services/alertas/recomendacao/recomendacaoAlertScoring.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function criarEvento({ tipoEvento, categoria, subcategoria, dataEvento, metadata }) {
  return {
    tipoEvento,
    categoria,
    subcategoria,
    dataEvento,
    metadataJson: metadata ? JSON.stringify(metadata) : null,
  };
}

runTest('score considera apenas sinais apos corretiva resolvida com sucesso', () => {
  const metricas = calcularScoreRisco({
    equipamento: {
      tipo: 'Tomografia',
      modelo: 'Aquilion',
      status: 'Operante',
    },
    unidadeNome: 'SIMEC Matriz',
    historicoEventos: [
      criarEvento({
        categoria: 'ocorrencia',
        tipoEvento: 'ocorrencia_registrada',
        subcategoria: 'Falha',
        dataEvento: '2026-04-18T12:00:00.000Z',
      }),
      criarEvento({
        categoria: 'manutencao',
        tipoEvento: 'manutencao_registrada',
        subcategoria: 'Corretiva',
        dataEvento: '2026-04-19T12:00:00.000Z',
      }),
      criarEvento({
        categoria: 'manutencao',
        tipoEvento: 'manutencao_concluir',
        subcategoria: 'Corretiva',
        dataEvento: '2026-04-20T12:00:00.000Z',
        metadata: {
          manutencaoRealizada: true,
          equipamentoOperante: true,
        },
      }),
      criarEvento({
        categoria: 'ocorrencia',
        tipoEvento: 'ocorrencia_registrada',
        subcategoria: 'Falha',
        dataEvento: '2026-04-21T12:00:00.000Z',
      }),
    ],
  });

  assert.equal(metricas.ocorrencias, 1);
  assert.equal(metricas.corretivas, 0);
  assert.equal(metricas.manutencoesResolvidasComSucesso, 1);
  assert.equal(metricas.ultimaResolucaoManutencao, '2026-04-20T12:00:00.000Z');
});

runTest('conclusao sem manutencao realizada nao reseta a base de risco', () => {
  const metricas = calcularScoreRisco({
    equipamento: {
      tipo: 'Tomografia',
      modelo: 'Aquilion',
      status: 'Operante',
    },
    unidadeNome: 'SIMEC Matriz',
    historicoEventos: [
      criarEvento({
        categoria: 'ocorrencia',
        tipoEvento: 'ocorrencia_registrada',
        subcategoria: 'Falha',
        dataEvento: '2026-04-18T12:00:00.000Z',
      }),
      criarEvento({
        categoria: 'manutencao',
        tipoEvento: 'manutencao_registrada',
        subcategoria: 'Corretiva',
        dataEvento: '2026-04-19T12:00:00.000Z',
      }),
      criarEvento({
        categoria: 'manutencao',
        tipoEvento: 'manutencao_concluir',
        subcategoria: 'Corretiva',
        dataEvento: '2026-04-20T12:00:00.000Z',
        metadata: {
          manutencaoRealizada: false,
          equipamentoOperante: true,
        },
      }),
    ],
  });

  assert.equal(metricas.ocorrencias, 1);
  assert.equal(metricas.corretivas, 1);
  assert.equal(metricas.manutencoesResolvidasComSucesso, 0);
  assert.equal(metricas.ultimaResolucaoManutencao, null);
});

runTest('preventiva concluida com sucesso tambem reseta o risco ativo anterior', () => {
  const metricas = calcularScoreRisco({
    equipamento: {
      tipo: 'Tomografia',
      modelo: 'Aquilion',
      status: 'Operante',
    },
    unidadeNome: 'SIMEC Matriz',
    historicoEventos: [
      criarEvento({
        categoria: 'ocorrencia',
        tipoEvento: 'ocorrencia_registrada',
        subcategoria: 'Falha',
        dataEvento: '2026-04-18T12:00:00.000Z',
      }),
      criarEvento({
        categoria: 'manutencao',
        tipoEvento: 'manutencao_concluir',
        subcategoria: 'Preventiva',
        dataEvento: '2026-04-20T12:00:00.000Z',
        metadata: {
          manutencaoRealizada: true,
          equipamentoOperante: true,
        },
      }),
      criarEvento({
        categoria: 'ocorrencia',
        tipoEvento: 'ocorrencia_registrada',
        subcategoria: 'Falha',
        dataEvento: '2026-04-21T12:00:00.000Z',
      }),
    ],
  });

  assert.equal(metricas.ocorrencias, 1);
  assert.equal(metricas.manutencoesResolvidasComSucesso, 1);
  assert.equal(metricas.ultimaResolucaoManutencao, '2026-04-20T12:00:00.000Z');
});

console.log('recomendacao-alert-scoring-tests-ok');
process.exit(0);
