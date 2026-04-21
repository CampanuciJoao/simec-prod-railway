import assert from 'node:assert/strict';

import { normalizarData } from '../../services/agent/agendamento/extractor/normalizers.js';
import { extrairCamposHeuristico } from '../../services/agent/agendamento/extractor/heuristicaExtractor.js';
import { getFaltantes } from '../../services/agent/agendamento/state/faltantes.js';
import { validarPayloadAgendamentoDoAgente } from '../../services/agent/workflow/dbManager.js';
import {
  avaliarCandidato,
  resolveFromCandidates,
} from '../../services/agent/shared/entityScoring.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

runTest('normalizarData aceita DD/MM/AAAA e DD/MM', () => {
  assert.equal(normalizarData('21/04/2026'), '2026-04-21');
  assert.match(normalizarData('21/04'), /^\d{4}-04-21$/);
});

runTest('heuristica extrai data e hora em formatos operacionais', () => {
  const extraidoData = extrairCamposHeuristico('21/04/2026', {});
  const extraidoHora = extrairCamposHeuristico('09:00h', {});

  assert.equal(extraidoData.data, '2026-04-21');
  assert.equal(extraidoHora.horaInicio, '09:00');
});

runTest(
  'faltantes do agendamento parcial pedem apenas horario quando a data ja existe',
  () => {
    const estadoParcial = {
      tipoManutencao: 'Preventiva',
      unidadeId: 'u1',
      equipamentoId: 'e1',
      data: '2026-04-21',
    };

    assert.deepEqual(getFaltantes(estadoParcial), ['horaInicio', 'horaFim']);
  }
);

runTest(
  'validacao final de manutencao parcial nao acusa data invalida quando so falta horario',
  () => {
    const estadoParcial = {
      tipoManutencao: 'Preventiva',
      equipamentoId: 'e1',
      data: '2026-04-21',
    };

    const { validacao } = validarPayloadAgendamentoDoAgente(estadoParcial);

    assert.equal(validacao.ok, false);
    assert.deepEqual(Object.keys(validacao.fieldErrors), [
      'agendamentoHoraInicioLocal',
      'agendamentoHoraFimLocal',
    ]);
  }
);

runTest(
  'matching parcial de unidade exige confirmacao em vez de resolucao automatica',
  () => {
    const candidatos = [
      { id: '1', nomeSistema: 'Unidade Matriz', cidade: 'Cuiaba' },
      { id: '2', nomeSistema: 'Unidade Centro', cidade: 'Cuiaba' },
    ];

    const resolution = resolveFromCandidates({
      query: 'Matriz',
      candidates: candidatos,
      toFields: (item) => [item.nomeSistema, item.cidade],
      toSuggestion: (item) => ({ id: item.id, label: item.nomeSistema }),
    });

    assert.equal(resolution.status, 'low_confidence');
    assert.equal(resolution.matches[0].label, 'Unidade Matriz');
  }
);

runTest('matching exato continua resolvendo automaticamente', () => {
  const candidatos = [
    { id: '1', nomeSistema: 'Unidade Matriz', cidade: 'Cuiaba' },
    { id: '2', nomeSistema: 'Unidade Centro', cidade: 'Cuiaba' },
  ];

  const resolution = resolveFromCandidates({
    query: 'Unidade Matriz',
    candidates: candidatos,
    toFields: (item) => [item.nomeSistema, item.cidade],
    toSuggestion: (item) => ({ id: item.id, label: item.nomeSistema }),
  });

  assert.equal(resolution.status, 'resolved');
  assert.equal(resolution.matches[0].label, 'Unidade Matriz');
});

runTest('avaliarCandidato diferencia match exato de termo parcial', () => {
  const exato = avaliarCandidato('Unidade Matriz', ['Unidade Matriz']);
  const parcial = avaliarCandidato('Matriz', ['Unidade Matriz']);

  assert.equal(exato, 1);
  assert.ok(parcial < exato);
  assert.ok(parcial >= 0.76);
});

console.log('agent-core-tests-ok');
process.exit(0);
