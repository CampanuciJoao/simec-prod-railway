import assert from 'node:assert/strict';

import {
  normalizarData,
  normalizarDataRelativa,
  normalizarHora,
} from '../../services/agent/agendamento/extractor/normalizers.js';
import { extrairCamposHeuristico } from '../../services/agent/agendamento/extractor/heuristicaExtractor.js';
import {
  buildParsingHintMessage,
  normalizeAgentMissingFields,
} from '../../services/agent/agendamento/agendamentoService.js';
import { buildAgentLogContext } from '../../services/agent/core/agentLogger.js';
import { getFaltantes } from '../../services/agent/agendamento/state/faltantes.js';
import { validarPayloadAgendamentoDoAgente } from '../../services/agent/workflow/dbManager.js';
import {
  avaliarCandidato,
  resolveFromCandidates,
} from '../../services/agent/shared/entityScoring.js';
import { validarHorarioFuturo } from '../../services/agent/agendamento/validators/horarioValidator.js';

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

runTest('normalizarData aceita ano curto e prefixo dia', () => {
  assert.equal(normalizarData('21/04/26'), '2026-04-21');
  assert.match(normalizarData('dia 21/04'), /^\d{4}-04-21$/);
});

runTest('normalizarHora aceita formatos com h', () => {
  assert.equal(normalizarHora('10h'), '10:00');
  assert.equal(normalizarHora('11:00h'), '11:00');
  assert.equal(normalizarHora('11h30'), '11:30');
});

runTest('normalizarDataRelativa aceita hoje e amanha', () => {
  const referencia = new Date('2026-04-20T12:00:00Z');

  assert.equal(normalizarDataRelativa('hoje', referencia), '2026-04-20');
  assert.equal(normalizarDataRelativa('amanhã', referencia), '2026-04-21');
});

runTest('heuristica extrai data e hora em formatos operacionais', () => {
  const extraidoData = extrairCamposHeuristico('21/04/2026', {});
  const extraidoHora = extrairCamposHeuristico('09:00h', {});
  const extraidoHoraCompacta = extrairCamposHeuristico('11h30', {});
  const extraidoDataCurta = extrairCamposHeuristico('dia 21/04/26', {});
  const extraidoDataRelativa = extrairCamposHeuristico('amanhã', {});
  const extraidoHoraFim = extrairCamposHeuristico('13:00h', {
    horaInicio: '12:00',
    horaFim: null,
  });

  assert.equal(extraidoData.data, '2026-04-21');
  assert.equal(extraidoData.horaInicio, null);
  assert.equal(extraidoHora.horaInicio, '09:00');
  assert.equal(extraidoHoraCompacta.horaInicio, '11:30');
  assert.equal(extraidoDataCurta.data, '2026-04-21');
  assert.match(extraidoDataRelativa.data, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(extraidoHoraFim.horaInicio, null);
  assert.equal(extraidoHoraFim.horaFim, '13:00');
});

runTest(
  'dica de parsing nao acusa horario quando a mensagem trouxe uma data valida',
  () => {
    const hint = buildParsingHintMessage(
      '21/04/2026',
      ['horaInicio', 'horaFim'],
      { data: '2026-04-21' }
    );

    assert.equal(hint, null);
  }
);

runTest(
  'dica de parsing acusa horario quando a mensagem numerica nao gerou extracao util',
  () => {
    const hint = buildParsingHintMessage('1030', ['horaInicio'], {});

    assert.equal(
      hint,
      'Nao consegui interpretar o horario informado. Use o formato HH:mm, por exemplo 09:00.'
    );
  }
);

runTest('logger do agente normaliza erros e limita profundidade', () => {
  const contexto = buildAgentLogContext(
    {
      requestId: 'req-1',
      tenantId: 'tenant-1',
    },
    {
      error: new Error('Falha de teste'),
      nested: {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: true,
              },
            },
          },
        },
      },
    }
  );

  assert.equal(contexto.error.message, 'Falha de teste');
  assert.equal(contexto.nested.level1.level2.level3.level4, '[max-depth]');
});

runTest('campos faltantes do schema sao convertidos para o vocabulário do agente', () => {
  assert.deepEqual(normalizeAgentMissingFields(['agendamentoHoraFimLocal']), [
    'horaFim',
  ]);
  assert.deepEqual(
    normalizeAgentMissingFields([
      'agendamentoDataInicioLocal',
      'agendamentoHoraInicioLocal',
      'agendamentoDataFimLocal',
      'agendamentoHoraFimLocal',
    ]),
    ['data', 'horaInicio', 'horaFim']
  );
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

runTest('validarHorarioFuturo aceita data e horario validos', () => {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);

  const yyyy = amanha.getFullYear();
  const mm = String(amanha.getMonth() + 1).padStart(2, '0');
  const dd = String(amanha.getDate()).padStart(2, '0');

  const resultado = validarHorarioFuturo(`${yyyy}-${mm}-${dd}`, '11:00');

  assert.equal(resultado.valido, true);
});

console.log('agent-core-tests-ok');
process.exit(0);
