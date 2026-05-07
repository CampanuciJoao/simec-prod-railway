import assert from 'node:assert/strict';
import test from 'node:test';

import {
  pareceOsCorretiva,
  pareceSeguro,
  pareceAgendamento,
  pareceConsultaRelatorio,
  ajustarIntencaoPorHeuristica,
} from '../../services/agent/router/intentRouting.js';

import {
  STEPS_OS,
  inicializarStepOs,
  mergeEstadoOs,
  getFaltantesAbrirOs,
  getFaltantesAgendarVisita,
  temDataHora,
  sinalizaNovaOcorrencia,
} from '../../services/agent/osCorretiva/state/osCorretivaState.js';

import {
  proximaPerguntaOs,
  formatarListaOsAbertas,
} from '../../services/agent/osCorretiva/ui/osCorretivaPerguntas.js';

import {
  buildResumoAbrirOs,
  buildResumoAgendarVisita,
} from '../../services/agent/osCorretiva/ui/osCorretivaResumo.js';

import {
  extrairConfirmacao,
  extrairOsIndex,
  inferirStatusEquipamento,
} from '../../services/agent/osCorretiva/extractor/osCorretivaExtractor.js';

// ─── Roteamento de intenção ───────────────────────────────────────────────────

test('pareceOsCorretiva detecta "ocorrência"', () => {
  assert.ok(pareceOsCorretiva('registrar ocorrência no tomógrafo'));
});

test('pareceOsCorretiva detecta "visita técnica"', () => {
  assert.ok(pareceOsCorretiva('agendar visita técnica para o equipamento'));
});

test('pareceOsCorretiva detecta "prestador"', () => {
  assert.ok(pareceOsCorretiva('quero chamar um prestador'));
});

test('pareceOsCorretiva detecta "equipamento parou"', () => {
  assert.ok(pareceOsCorretiva('equipamento parou de funcionar'));
});

test('pareceOsCorretiva nao dispara para mensagem de agendamento preventivo', () => {
  assert.equal(pareceOsCorretiva('quero agendar uma preventiva'), false);
});

test('ajustarIntencaoPorHeuristica prioriza SEGURO sobre OS_CORRETIVA', () => {
  const msg = 'qual a apolice do seguro do equipamento';
  const resultado = ajustarIntencaoPorHeuristica('OS_CORRETIVA', msg);
  assert.equal(resultado, 'SEGURO');
});

test('ajustarIntencaoPorHeuristica prioriza OS_CORRETIVA sobre AGENDAR_MANUTENCAO', () => {
  const msg = 'quero agendar visita tecnica para ocorrencia no tomografo';
  const resultado = ajustarIntencaoPorHeuristica('AGENDAR_MANUTENCAO', msg);
  assert.equal(resultado, 'OS_CORRETIVA');
});

test('ajustarIntencaoPorHeuristica corrige OUTRO para OS_CORRETIVA quando sinaliza ocorrencia', () => {
  const msg = 'equipamento quebrou';
  const resultado = ajustarIntencaoPorHeuristica('OUTRO', msg);
  assert.equal(resultado, 'OS_CORRETIVA');
});

test('ajustarIntencaoPorHeuristica mantem LLM quando nao ha heuristica', () => {
  const resultado = ajustarIntencaoPorHeuristica('RELATORIO', 'quando foi a ultima manutencao');
  assert.equal(resultado, 'RELATORIO');
});

test('pareceSeguro nao contamina roteamento de OS', () => {
  assert.ok(pareceSeguro('qual a cobertura do seguro'));
  assert.equal(pareceOsCorretiva('qual a cobertura do seguro'), false);
});

test('pareceConsultaRelatorio detecta consulta de historico', () => {
  assert.ok(pareceConsultaRelatorio('quando foi a ultima manutencao'));
  assert.ok(pareceConsultaRelatorio('quais preventivas no ultimo ano'));
});

// ─── Máquina de estados ───────────────────────────────────────────────────────

test('inicializarStepOs define START quando step ausente', () => {
  const estado = inicializarStepOs({});
  assert.equal(estado.step, STEPS_OS.START);
});

test('inicializarStepOs preserva step valido existente', () => {
  const estado = inicializarStepOs({ step: STEPS_OS.COLETANDO_DADOS });
  assert.equal(estado.step, STEPS_OS.COLETANDO_DADOS);
});

test('getFaltantesAbrirOs retorna os 3 campos quando estado vazio', () => {
  assert.deepEqual(getFaltantesAbrirOs({}), [
    'equipamentoId',
    'descricaoProblema',
    'statusEquipamentoAbertura',
  ]);
});

test('getFaltantesAbrirOs retorna vazio quando todos preenchidos', () => {
  const estado = {
    equipamentoId: 'eq-1',
    descricaoProblema: 'Tomógrafo parado',
    statusEquipamentoAbertura: 'Inoperante',
  };
  assert.deepEqual(getFaltantesAbrirOs(estado), []);
});

test('getFaltantesAbrirOs retorna apenas statusEquipamentoAbertura quando falta so ele', () => {
  const estado = { equipamentoId: 'eq-1', descricaoProblema: 'Falha no gantry' };
  assert.deepEqual(getFaltantesAbrirOs(estado), ['statusEquipamentoAbertura']);
});

test('getFaltantesAgendarVisita retorna os 6 campos quando estado vazio', () => {
  assert.deepEqual(getFaltantesAgendarVisita({}), [
    'equipamentoId',
    'osId',
    'prestadorNome',
    'data',
    'horaInicio',
    'horaFim',
  ]);
});

test('getFaltantesAgendarVisita retorna vazio quando todos preenchidos', () => {
  const estado = {
    equipamentoId: 'eq-1',
    osId: 'os-1',
    prestadorNome: 'Siemens Service',
    data: '2026-05-20',
    horaInicio: '14:00',
    horaFim: '16:00',
  };
  assert.deepEqual(getFaltantesAgendarVisita(estado), []);
});

test('mergeEstadoOs nao sobrescreve equipamentoId ja resolvido', () => {
  const estado = { equipamentoId: 'eq-1', equipamentoTexto: 'Tomógrafo' };
  const extraido = { equipamentoTexto: 'TC Siemens', descricaoProblema: 'Falha' };
  const novo = mergeEstadoOs(estado, extraido);
  assert.equal(novo.equipamentoId, 'eq-1');
  assert.equal(novo.equipamentoTexto, 'Tomógrafo');
});

test('mergeEstadoOs atualiza descricaoProblema', () => {
  const estado = { equipamentoId: 'eq-1', descricaoProblema: 'Erro antigo' };
  const extraido = { descricaoProblema: 'Tomógrafo parou completamente' };
  const novo = mergeEstadoOs(estado, extraido);
  assert.equal(novo.descricaoProblema, 'Tomógrafo parou completamente');
});

test('temDataHora true quando data presente', () => {
  assert.ok(temDataHora({ data: '2026-05-20' }));
});

test('temDataHora true quando horaInicio presente', () => {
  assert.ok(temDataHora({ horaInicio: '14:00' }));
});

test('temDataHora false quando nenhum dos dois', () => {
  assert.equal(temDataHora({ prestadorNome: 'Siemens' }), false);
});

test('sinalizaNovaOcorrencia detecta "nova ocorrência"', () => {
  assert.ok(sinalizaNovaOcorrencia({}, 'quero registrar uma nova ocorrência'));
});

test('sinalizaNovaOcorrencia detecta "problema diferente"', () => {
  assert.ok(sinalizaNovaOcorrencia({}, 'é um problema diferente'));
});

test('sinalizaNovaOcorrencia detecta flag do extractor', () => {
  assert.ok(sinalizaNovaOcorrencia({ novaOcorrencia: true }, ''));
});

test('sinalizaNovaOcorrencia false para mensagem neutra', () => {
  assert.equal(sinalizaNovaOcorrencia({}, 'sim, quero agendar a visita'), false);
});

// ─── Extractor — heurísticas puras ───────────────────────────────────────────

test('extrairConfirmacao true para "sim"', () => {
  assert.equal(extrairConfirmacao('sim'), true);
});

test('extrairConfirmacao true para "confirmar"', () => {
  assert.equal(extrairConfirmacao('confirmar'), true);
});

test('extrairConfirmacao false para "não"', () => {
  assert.equal(extrairConfirmacao('não'), false);
});

test('extrairConfirmacao false para "cancelar ocorrencia"', () => {
  assert.equal(extrairConfirmacao('cancelar ocorrencia'), false);
});

test('extrairConfirmacao null para mensagem ambigua', () => {
  assert.equal(extrairConfirmacao('tomógrafo parou'), null);
});

test('inferirStatusEquipamento Inoperante para "parou"', () => {
  assert.equal(inferirStatusEquipamento('equipamento parou de funcionar'), 'Inoperante');
});

test('inferirStatusEquipamento Inoperante para "quebrou"', () => {
  assert.equal(inferirStatusEquipamento('o aparelho quebrou'), 'Inoperante');
});

test('inferirStatusEquipamento UsoLimitado para "parcialmente"', () => {
  assert.equal(inferirStatusEquipamento('está funcionando parcialmente'), 'UsoLimitado');
});

test('inferirStatusEquipamento UsoLimitado para "intermitente"', () => {
  assert.equal(inferirStatusEquipamento('funcionamento intermitente'), 'UsoLimitado');
});

test('inferirStatusEquipamento EmManutencao para "revisão"', () => {
  assert.equal(inferirStatusEquipamento('aguardando revisão técnica'), 'EmManutencao');
});

test('inferirStatusEquipamento null para descricao neutra', () => {
  assert.equal(inferirStatusEquipamento('verificar o equipamento'), null);
});

test('inferirStatusEquipamento null para entrada nula', () => {
  assert.equal(inferirStatusEquipamento(null), null);
});

test('extrairOsIndex 1 para "primeira"', () => {
  assert.equal(extrairOsIndex('primeira'), 1);
});

test('extrairOsIndex 2 para "2"', () => {
  assert.equal(extrairOsIndex('2'), 2);
});

test('extrairOsIndex 2 para "a segunda"', () => {
  assert.equal(extrairOsIndex('a segunda'), 2);
});

test('extrairOsIndex null para texto livre', () => {
  assert.equal(extrairOsIndex('quero agendar visita'), null);
});

// ─── UI — perguntas e formatação ──────────────────────────────────────────────

test('proximaPerguntaOs pergunta equipamento quando falta equipamentoId em ABRIR_OS', () => {
  const pergunta = proximaPerguntaOs('ABRIR_OS', ['equipamentoId', 'descricaoProblema']);
  assert.match(pergunta, /equipamento/i);
});

test('proximaPerguntaOs pergunta problema quando falta descricaoProblema em ABRIR_OS', () => {
  const pergunta = proximaPerguntaOs('ABRIR_OS', ['descricaoProblema', 'statusEquipamentoAbertura']);
  assert.match(pergunta, /problema/i);
});

test('proximaPerguntaOs pergunta status com opcoes numeradas em ABRIR_OS', () => {
  const pergunta = proximaPerguntaOs('ABRIR_OS', ['statusEquipamentoAbertura']);
  assert.match(pergunta, /1\./);
  assert.match(pergunta, /Inoperante/);
});

test('proximaPerguntaOs pergunta prestador quando falta prestadorNome em AGENDAR_VISITA', () => {
  const pergunta = proximaPerguntaOs('AGENDAR_VISITA', ['prestadorNome']);
  assert.match(pergunta, /prestador/i);
});

test('proximaPerguntaOs pergunta data quando falta data em AGENDAR_VISITA', () => {
  const pergunta = proximaPerguntaOs('AGENDAR_VISITA', ['data']);
  assert.match(pergunta, /data/i);
});

test('formatarListaOsAbertas formata com numeros e status', () => {
  const lista = [
    { numeroOS: 'COR-001', status: 'Aberta', descricaoProblema: 'Falha no gantry' },
    { numeroOS: 'COR-002', status: 'AguardandoTerceiro', descricaoProblema: 'Barulho no motor' },
  ];
  const resultado = formatarListaOsAbertas(lista);
  assert.match(resultado, /\*\*1\.\*\*/);
  assert.match(resultado, /COR-001/);
  assert.match(resultado, /Aguardando Terceiro/);
  assert.match(resultado, /\*\*2\.\*\*/);
});

test('formatarListaOsAbertas retorna string vazia para lista vazia', () => {
  assert.equal(formatarListaOsAbertas([]), '');
});

test('formatarListaOsAbertas trunca descricao longa', () => {
  const lista = [
    { numeroOS: 'COR-001', status: 'Aberta', descricaoProblema: 'A'.repeat(100) },
  ];
  const resultado = formatarListaOsAbertas(lista);
  assert.match(resultado, /\.\.\./);
});

// ─── UI — resumos de confirmação ──────────────────────────────────────────────

test('buildResumoAbrirOs inclui equipamento e descricao', () => {
  const estado = {
    equipamentoNome: 'Tomógrafo Siemens',
    unidadeNome: 'CASSEMS Campo Grande',
    descricaoProblema: 'Parou de funcionar',
    statusEquipamentoAbertura: 'Inoperante',
    solicitante: 'João',
  };
  const resumo = buildResumoAbrirOs(estado);
  assert.match(resumo, /Tomógrafo Siemens/);
  assert.match(resumo, /Parou de funcionar/);
  assert.match(resumo, /Inoperante/);
});

test('buildResumoAgendarVisita inclui OS, prestador e horario', () => {
  const estado = {
    osNumero: 'COR-2026-001',
    equipamentoNome: 'Tomógrafo Siemens',
    prestadorNome: 'Siemens Service',
    data: '2026-05-20',
    horaInicio: '14:00',
    horaFim: '16:00',
  };
  const resumo = buildResumoAgendarVisita(estado);
  assert.match(resumo, /COR-2026-001/);
  assert.match(resumo, /Siemens Service/);
  assert.match(resumo, /14:00/);
  assert.match(resumo, /16:00/);
});
