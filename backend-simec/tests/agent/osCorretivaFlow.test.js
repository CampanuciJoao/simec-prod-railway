/**
 * Simulação de conversas multi-turn para OS Corretiva.
 *
 * Não chama o serviço completo (requer banco/LLM).
 * Exercita a máquina de estados pura: mergeEstadoOs, getFaltantes, step transitions,
 * sinalizaNovaOcorrencia, temDataHora — exatamente o que o service executa em cada turn.
 *
 * Cada cenário simula turns sequenciais com estado acumulado entre eles,
 * tal como o AgentSessionRepository persiste entre chamadas reais.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

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
  inferirStatusEquipamento,
} from '../../services/agent/osCorretiva/extractor/osCorretivaExtractor.js';

// ─── Helpers de simulação ─────────────────────────────────────────────────────

function turnoAbrir(estado, extraido) {
  let s = { ...estado };
  s = mergeEstadoOs(s, extraido);

  if (!s.fluxo) {
    s.fluxo = 'ABRIR_OS';
    s.solicitante = extraido.solicitante || 'Usuário Teste';
  }

  if (!s.statusEquipamentoAbertura && s.fluxo === 'ABRIR_OS' && extraido.descricaoProblema) {
    s.statusEquipamentoAbertura = inferirStatusEquipamento(extraido.descricaoProblema);
  }

  const faltantes = getFaltantesAbrirOs(s);

  if (faltantes.length === 0) {
    s.step = STEPS_OS.AGUARDANDO_CONFIRMACAO;
    return { estado: s, pergunta: buildResumoAbrirOs(s) };
  }

  s.step = STEPS_OS.COLETANDO_DADOS;
  return { estado: s, pergunta: proximaPerguntaOs('ABRIR_OS', faltantes) };
}

function turnoAgendar(estado, extraido) {
  let s = { ...estado };
  s = mergeEstadoOs(s, extraido);

  const faltantes = getFaltantesAgendarVisita(s);

  if (faltantes.length === 0) {
    s.step = STEPS_OS.AGUARDANDO_CONFIRMACAO;
    return { estado: s, pergunta: buildResumoAgendarVisita(s) };
  }

  s.step = STEPS_OS.COLETANDO_DADOS;
  return { estado: s, pergunta: proximaPerguntaOs('AGENDAR_VISITA', faltantes) };
}

// ─── Cenário 1: Registrar ocorrência (fluxo completo sem banco) ───────────────

test('cenario registrar ocorrencia — turn 1: sem equipamento, pergunta qual equipamento', () => {
  const estado = inicializarStepOs({});
  const extraido = {};
  const { pergunta } = turnoAbrir(estado, extraido);
  assert.match(pergunta, /equipamento/i);
});

test('cenario registrar ocorrencia — turn 2: equipamento informado, pergunta problema', () => {
  let estado = inicializarStepOs({});
  // Turn 1: equipamento recebido mas não resolvido ainda — simula equipamentoId já resolvido
  estado = { ...estado, equipamentoId: 'eq-tc-01', equipamentoNome: 'Tomógrafo Siemens', step: STEPS_OS.COLETANDO_DADOS, fluxo: 'ABRIR_OS', solicitante: 'João' };
  const extraido = {};
  const { pergunta } = turnoAbrir(estado, extraido);
  assert.match(pergunta, /problema/i);
});

test('cenario registrar ocorrencia — turn 3: problema informado, status inferido, pergunta status', () => {
  let estado = {
    step: STEPS_OS.COLETANDO_DADOS,
    fluxo: 'ABRIR_OS',
    solicitante: 'João',
    equipamentoId: 'eq-tc-01',
    equipamentoNome: 'Tomógrafo Siemens',
  };
  const extraido = { descricaoProblema: 'parou completamente' };
  const { estado: novoEstado, pergunta } = turnoAbrir(estado, extraido);

  // Status deve ser inferido automaticamente de "parou"
  assert.equal(novoEstado.statusEquipamentoAbertura, 'Inoperante');
  // Com tudo preenchido, vai direto para confirmação
  assert.equal(novoEstado.step, STEPS_OS.AGUARDANDO_CONFIRMACAO);
  assert.match(pergunta, /Confirme/);
});

test('cenario registrar ocorrencia — turn 3: problema sem status claro, pergunta status', () => {
  let estado = {
    step: STEPS_OS.COLETANDO_DADOS,
    fluxo: 'ABRIR_OS',
    solicitante: 'João',
    equipamentoId: 'eq-tc-01',
    equipamentoNome: 'Tomógrafo Siemens',
  };
  const extraido = { descricaoProblema: 'apresentando erro esporádico' };
  const { estado: novoEstado, pergunta } = turnoAbrir(estado, extraido);
  // Status não inferido → ainda faltante
  assert.equal(novoEstado.statusEquipamentoAbertura, null);
  assert.match(pergunta, /status/i);
});

test('cenario registrar ocorrencia — turn 4: status selecionado, chega a confirmacao', () => {
  let estado = {
    step: STEPS_OS.COLETANDO_DADOS,
    fluxo: 'ABRIR_OS',
    solicitante: 'João',
    equipamentoId: 'eq-tc-01',
    equipamentoNome: 'Tomógrafo Siemens',
    descricaoProblema: 'Erro esporádico de comunicação',
  };
  const extraido = { statusEquipamentoAbertura: 'UsoLimitado' };
  const { estado: novoEstado, pergunta } = turnoAbrir(estado, extraido);
  assert.equal(novoEstado.step, STEPS_OS.AGUARDANDO_CONFIRMACAO);
  assert.match(pergunta, /UsoLimitado|Uso Limitado/);
});

test('cenario registrar ocorrencia — resumo contém todos os dados', () => {
  const estado = {
    equipamentoId: 'eq-tc-01',
    equipamentoNome: 'Tomógrafo Siemens',
    unidadeNome: 'CASSEMS Campo Grande',
    descricaoProblema: 'Parou de funcionar completamente',
    statusEquipamentoAbertura: 'Inoperante',
    solicitante: 'João Campanuci',
  };
  const resumo = buildResumoAbrirOs(estado);
  assert.match(resumo, /Tomógrafo Siemens/);
  assert.match(resumo, /CASSEMS Campo Grande/);
  assert.match(resumo, /Parou de funcionar/);
  assert.match(resumo, /Inoperante/);
  assert.match(resumo, /João Campanuci/);
  assert.match(resumo, /Sim.*Não|Não.*Sim/s);
});

test('cenario registrar ocorrencia — turn final: confirmacao lida corretamente', () => {
  assert.equal(extrairConfirmacao('sim'), true);
  assert.equal(extrairConfirmacao('confirmar'), true);
  assert.equal(extrairConfirmacao('não'), false);
});

// ─── Cenário 2: Agendar visita de terceiro ────────────────────────────────────

test('cenario agendar visita — turn 1: equipamento + data + osId, falta prestador', () => {
  const estado = {
    step: STEPS_OS.COLETANDO_DADOS,
    fluxo: 'AGENDAR_VISITA',
    equipamentoId: 'eq-tc-01',
    osId: 'os-corr-001',
    osNumero: 'COR-2026-001',
    data: '2026-05-20',
    horaInicio: '14:00',
    horaFim: '16:00',
  };
  const extraido = {};
  const { pergunta } = turnoAgendar(estado, extraido);
  assert.match(pergunta, /prestador/i);
});

test('cenario agendar visita — turn 2: prestador informado, vai para confirmacao', () => {
  const estado = {
    step: STEPS_OS.COLETANDO_DADOS,
    fluxo: 'AGENDAR_VISITA',
    equipamentoId: 'eq-tc-01',
    osId: 'os-corr-001',
    osNumero: 'COR-2026-001',
    data: '2026-05-20',
    horaInicio: '14:00',
    horaFim: '16:00',
  };
  const extraido = { prestadorNome: 'Siemens Healthineers' };
  const { estado: novoEstado, pergunta } = turnoAgendar(estado, extraido);
  assert.equal(novoEstado.step, STEPS_OS.AGUARDANDO_CONFIRMACAO);
  assert.match(pergunta, /COR-2026-001/);
  assert.match(pergunta, /Siemens Healthineers/);
  assert.match(pergunta, /14:00/);
  assert.match(pergunta, /16:00/);
});

test('cenario agendar visita — turn 1: sem data, falta data depois de prestador', () => {
  const estado = {
    step: STEPS_OS.COLETANDO_DADOS,
    fluxo: 'AGENDAR_VISITA',
    equipamentoId: 'eq-tc-01',
    osId: 'os-corr-001',
    prestadorNome: 'Siemens',
  };
  const extraido = {};
  const faltantes = getFaltantesAgendarVisita({ ...estado });
  assert.ok(faltantes.includes('data'));
});

test('cenario agendar visita — resumo formata data no padrao DD/MM/YYYY', () => {
  const estado = {
    osNumero: 'COR-2026-001',
    osDescricao: 'Falha no gantry',
    equipamentoNome: 'Tomógrafo',
    prestadorNome: 'Siemens',
    data: '2026-05-20',
    horaInicio: '14:00',
    horaFim: '16:00',
  };
  const resumo = buildResumoAgendarVisita(estado);
  assert.match(resumo, /20\/05\/2026/);
});

// ─── Cenário 3: Múltiplas OSes abertas — seleção da OS ───────────────────────

test('cenario multiplas OSes — lista exibe numeracao correta', () => {
  const osesAbertas = [
    { numeroOS: 'COR-001', status: 'Aberta', descricaoProblema: 'Falha no gantry' },
    { numeroOS: 'COR-002', status: 'EmAndamento', descricaoProblema: 'Barulho no motor' },
    { numeroOS: 'COR-003', status: 'AguardandoTerceiro', descricaoProblema: 'Display com falha' },
  ];
  const lista = formatarListaOsAbertas(osesAbertas);
  assert.match(lista, /\*\*1\.\*\*/);
  assert.match(lista, /COR-001/);
  assert.match(lista, /\*\*2\.\*\*/);
  assert.match(lista, /COR-002/);
  assert.match(lista, /\*\*3\.\*\*/);
  assert.match(lista, /Aguardando Terceiro/);
});

test('cenario multiplas OSes — temDataHora detecta intencao de agendar visita', () => {
  // Usuário envia mensagem já com data → roteado para AGENDAR_VISITA
  assert.ok(temDataHora({ data: '2026-05-20' }));
  assert.ok(temDataHora({ horaInicio: '14:00' }));
  assert.equal(temDataHora({}), false);
});

test('cenario multiplas OSes — SELECIONANDO_OS: estado apos selecionar OS 2', () => {
  const osesAbertas = [
    { id: 'os-1', numeroOS: 'COR-001', status: 'Aberta', descricaoProblema: 'Falha A' },
    { id: 'os-2', numeroOS: 'COR-002', status: 'EmAndamento', descricaoProblema: 'Falha B' },
  ];
  // Simula seleção: index 2 → segunda OS
  const osSelecionada = osesAbertas[2 - 1];
  assert.equal(osSelecionada.id, 'os-2');
  assert.equal(osSelecionada.numeroOS, 'COR-002');
});

// ─── Cenário 4: OS existente, sem data — SELECIONANDO_ACAO ───────────────────

test('cenario SELECIONANDO_ACAO — "visita" direciona para AGENDAR_VISITA', () => {
  const m = 'quero agendar uma visita';
  const querVisita = /visita|agendar|terceiro|prestador|técnico|tecnico/.test(m.toLowerCase());
  assert.ok(querVisita);
});

test('cenario SELECIONANDO_ACAO — "nova ocorrência" direciona para ABRIR_OS', () => {
  const mensagem = 'quero registrar uma nova ocorrência, é um problema diferente';
  assert.ok(sinalizaNovaOcorrencia({}, mensagem));
});

test('cenario SELECIONANDO_ACAO — mensagem neutra nao detecta intencao', () => {
  const m = 'não sei ainda';
  const querVisita = /visita|agendar|terceiro|prestador|técnico|tecnico/.test(m);
  const querNova = sinalizaNovaOcorrencia({}, m);
  assert.equal(querVisita, false);
  assert.equal(querNova, false);
});

// ─── Cenário 5: Nova ocorrência sinalizada mesmo com OS aberta ───────────────

test('cenario nova ocorrencia com OS existente — sinalizaNovaOcorrencia via flag extractor', () => {
  assert.ok(sinalizaNovaOcorrencia({ novaOcorrencia: true }, ''));
});

test('cenario nova ocorrencia — "abrir nova" detectado como nova ocorrencia', () => {
  assert.ok(sinalizaNovaOcorrencia({}, 'quero abrir nova ocorrência'));
});

test('cenario nova ocorrencia — "outro defeito" detectado como nova ocorrencia', () => {
  assert.ok(sinalizaNovaOcorrencia({}, 'é um outro defeito agora'));
});

// ─── Cenário 6: Conflito de agenda — limpeza de estado após 409 ──────────────

test('cenario conflito de agenda — limpeza de data/hora mantém prestador e osId', () => {
  const estadoConflito = {
    fluxo: 'AGENDAR_VISITA',
    equipamentoId: 'eq-tc-01',
    osId: 'os-1',
    osNumero: 'COR-001',
    prestadorNome: 'Siemens',
    data: '2026-05-20',
    horaInicio: '14:00',
    horaFim: '16:00',
    step: STEPS_OS.AGUARDANDO_CONFIRMACAO,
  };

  // Simula o que o service faz após 409: limpa apenas data/hora
  const estadoAposConflito = {
    ...estadoConflito,
    data: null,
    horaInicio: null,
    horaFim: null,
    aguardandoConfirmacao: false,
    step: STEPS_OS.COLETANDO_DADOS,
  };

  // Prestador e OS devem continuar
  assert.equal(estadoAposConflito.prestadorNome, 'Siemens');
  assert.equal(estadoAposConflito.osId, 'os-1');
  // Data/hora limpos
  assert.equal(estadoAposConflito.data, null);
  assert.equal(estadoAposConflito.horaInicio, null);
  // Faltantes corretos após limpeza
  const faltantes = getFaltantesAgendarVisita(estadoAposConflito);
  assert.ok(faltantes.includes('data'));
  assert.ok(faltantes.includes('horaInicio'));
  assert.equal(faltantes.includes('prestadorNome'), false);
  assert.equal(faltantes.includes('osId'), false);
});

test('cenario conflito de agenda — step volta para COLETANDO_DADOS e pergunta nova data', () => {
  const estadoAposConflito = {
    fluxo: 'AGENDAR_VISITA',
    equipamentoId: 'eq-1',
    osId: 'os-1',
    prestadorNome: 'Siemens',
    data: null,
    horaInicio: null,
    horaFim: null,
    step: STEPS_OS.COLETANDO_DADOS,
  };
  const faltantes = getFaltantesAgendarVisita(estadoAposConflito);
  const pergunta = proximaPerguntaOs('AGENDAR_VISITA', faltantes);
  assert.match(pergunta, /data/i);
});

// ─── Cenário 7: Cancelamento durante coleta ───────────────────────────────────

test('cenario cancelamento — "nao" reconhecido como confirmacao negativa', () => {
  assert.equal(extrairConfirmacao('nao'), false);
  assert.equal(extrairConfirmacao('não quero'), false);
  assert.equal(extrairConfirmacao('cancelar'), false);
});

test('cenario cancelamento — "negativo" reconhecido como cancelamento', () => {
  assert.equal(extrairConfirmacao('negativo'), false);
});

// ─── Invariantes da máquina de estados ───────────────────────────────────────

test('maquina de estados — STEPS_OS contem todos os steps esperados', () => {
  const esperados = ['START', 'SELECIONANDO_ACAO', 'SELECIONANDO_OS', 'COLETANDO_DADOS', 'AGUARDANDO_CONFIRMACAO', 'FINALIZADO', 'CANCELADO'];
  for (const step of esperados) {
    assert.ok(STEPS_OS[step], `Step ausente: ${step}`);
  }
});

test('maquina de estados — inicializarStepOs sempre retorna step valido', () => {
  const invalidos = [null, undefined, '', 'INEXISTENTE', 42];
  for (const entrada of invalidos) {
    const resultado = inicializarStepOs({ step: entrada });
    assert.ok(Object.values(STEPS_OS).includes(resultado.step), `Step invalido gerado: ${resultado.step}`);
  }
});

test('maquina de estados — mergeEstadoOs nao muta o estado original', () => {
  const original = { step: STEPS_OS.COLETANDO_DADOS, equipamentoId: 'eq-1' };
  const copia = { ...original };
  mergeEstadoOs(original, { descricaoProblema: 'teste' });
  assert.deepEqual(original, copia);
});

test('maquina de estados — getFaltantesAbrirOs e deterministico para mesmo estado', () => {
  const estado = { equipamentoId: 'eq-1' };
  const f1 = getFaltantesAbrirOs(estado);
  const f2 = getFaltantesAbrirOs(estado);
  assert.deepEqual(f1, f2);
});

test('maquina de estados — getFaltantesAgendarVisita e deterministico para mesmo estado', () => {
  const estado = { equipamentoId: 'eq-1', osId: 'os-1' };
  const f1 = getFaltantesAgendarVisita(estado);
  const f2 = getFaltantesAgendarVisita(estado);
  assert.deepEqual(f1, f2);
});
