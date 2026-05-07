import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeEstadoAgente } from '../../services/agent/agendamento/state/mergeEstadoAgente.js';
import {
  mensagemEhConfirmacaoCurta,
} from '../../services/agent/agendamento/extractor/heuristicaExtractor.js';
import {
  normalizarTipoManutencao,
  normalizarHora,
  normalizarData,
  normalizarDataRelativa,
  normalizarObjetoIA,
  mesclarPreferindoIAComFallback,
} from '../../services/agent/agendamento/extractor/normalizers.js';

// ─── mergeEstadoAgente ────────────────────────────────────────────────────────

test('mergeEstadoAgente atualiza campo simples quando extraido tem valor', () => {
  const estado = { tipoManutencao: null };
  const extraido = { tipoManutencao: 'Preventiva' };
  const novo = mergeEstadoAgente(estado, extraido);
  assert.equal(novo.tipoManutencao, 'Preventiva');
});

test('mergeEstadoAgente nao sobrescreve com null', () => {
  const estado = { tipoManutencao: 'Preventiva' };
  const extraido = { tipoManutencao: null };
  const novo = mergeEstadoAgente(estado, extraido);
  assert.equal(novo.tipoManutencao, 'Preventiva');
});

test('mergeEstadoAgente nao sobrescreve com string vazia', () => {
  const estado = { data: '2026-05-20' };
  const extraido = { data: '' };
  const novo = mergeEstadoAgente(estado, extraido);
  assert.equal(novo.data, '2026-05-20');
});

test('mergeEstadoAgente limpa equipamento quando unidade muda', () => {
  const estado = {
    unidadeTexto: 'CASSEMS Campo Grande',
    unidadeId: 'u1',
    equipamentoTexto: 'Tomógrafo',
    equipamentoId: 'eq1',
    equipamentoNome: 'TC Siemens',
    entityResolution: { equipamento: { status: 'resolved' } },
  };
  const extraido = { unidadeTexto: 'CASSEMS Coxim' };
  const novo = mergeEstadoAgente(estado, extraido);
  assert.equal(novo.unidadeTexto, 'CASSEMS Coxim');
  assert.equal(novo.unidadeId, null);
  assert.equal(novo.equipamentoId, null);
  assert.equal(novo.equipamentoNome, null);
  assert.equal(novo.entityResolution, null);
});

test('mergeEstadoAgente limpa equipamentoId quando equipamento muda', () => {
  const estado = {
    equipamentoTexto: 'Tomógrafo',
    equipamentoId: 'eq1',
    equipamentoNome: 'TC Siemens',
    entityResolution: { equipamento: { status: 'resolved' } },
  };
  const extraido = { equipamentoTexto: 'Raio-X' };
  const novo = mergeEstadoAgente(estado, extraido);
  assert.equal(novo.equipamentoId, null);
  assert.equal(novo.equipamentoNome, null);
  assert.equal(novo.entityResolution?.equipamento, null);
});

test('mergeEstadoAgente nao limpa equipamento quando unidade e a mesma', () => {
  const estado = {
    unidadeTexto: 'CASSEMS Campo Grande',
    unidadeId: 'u1',
    equipamentoId: 'eq1',
  };
  const extraido = { unidadeTexto: 'CASSEMS Campo Grande', data: '2026-05-20' };
  const novo = mergeEstadoAgente(estado, extraido);
  assert.equal(novo.equipamentoId, 'eq1');
});

test('mergeEstadoAgente atualiza data e hora sem afetar entidade', () => {
  const estado = {
    equipamentoId: 'eq1',
    data: '2026-05-20',
    horaInicio: '09:00',
  };
  const extraido = { data: '2026-05-21', horaInicio: '10:00', horaFim: '11:00' };
  const novo = mergeEstadoAgente(estado, extraido);
  assert.equal(novo.data, '2026-05-21');
  assert.equal(novo.horaInicio, '10:00');
  assert.equal(novo.horaFim, '11:00');
  assert.equal(novo.equipamentoId, 'eq1');
});

test('mergeEstadoAgente preserva campos nao listados no CAMPOS', () => {
  const estado = { equipamentoId: 'eq1', step: 'COLETANDO_DADOS', fluxo: 'ABRIR_OS' };
  const extraido = { data: '2026-05-20' };
  const novo = mergeEstadoAgente(estado, extraido);
  assert.equal(novo.step, 'COLETANDO_DADOS');
  assert.equal(novo.fluxo, 'ABRIR_OS');
});

// ─── mensagemEhConfirmacaoCurta ───────────────────────────────────────────────

test('mensagemEhConfirmacaoCurta true para "sim"', () => {
  assert.ok(mensagemEhConfirmacaoCurta('sim'));
});

test('mensagemEhConfirmacaoCurta true para "s"', () => {
  assert.ok(mensagemEhConfirmacaoCurta('s'));
});

test('mensagemEhConfirmacaoCurta true para "ok"', () => {
  assert.ok(mensagemEhConfirmacaoCurta('ok'));
});

test('mensagemEhConfirmacaoCurta true para "nao"', () => {
  assert.ok(mensagemEhConfirmacaoCurta('nao'));
});

test('mensagemEhConfirmacaoCurta true para "cancelar"', () => {
  assert.ok(mensagemEhConfirmacaoCurta('cancelar'));
});

test('mensagemEhConfirmacaoCurta true para "confirmo"', () => {
  assert.ok(mensagemEhConfirmacaoCurta('confirmo'));
});

test('mensagemEhConfirmacaoCurta false para frase longa', () => {
  assert.equal(mensagemEhConfirmacaoCurta('quero agendar para amanha'), false);
});

test('mensagemEhConfirmacaoCurta true para "certo" com acento removido', () => {
  assert.ok(mensagemEhConfirmacaoCurta('certo'));
});

// ─── normalizarTipoManutencao ─────────────────────────────────────────────────

test('normalizarTipoManutencao retorna Preventiva para "preventiva"', () => {
  assert.equal(normalizarTipoManutencao('preventiva'), 'Preventiva');
});

test('normalizarTipoManutencao retorna Preventiva para "Preventiva"', () => {
  assert.equal(normalizarTipoManutencao('Preventiva'), 'Preventiva');
});

test('normalizarTipoManutencao retorna Corretiva para "corretiva"', () => {
  assert.equal(normalizarTipoManutencao('corretiva'), 'Corretiva');
});

test('normalizarTipoManutencao retorna null para valor desconhecido', () => {
  assert.equal(normalizarTipoManutencao('calibracao'), null);
});

test('normalizarTipoManutencao retorna null para null', () => {
  assert.equal(normalizarTipoManutencao(null), null);
});

// ─── normalizarHora — formatos extras ────────────────────────────────────────

test('normalizarHora aceita "meio dia"', () => {
  assert.equal(normalizarHora('meio dia'), '12:00');
});

test('normalizarHora aceita "meia noite"', () => {
  assert.equal(normalizarHora('meia noite'), '00:00');
});

test('normalizarHora aceita "2pm"', () => {
  assert.equal(normalizarHora('2pm'), '14:00');
});

test('normalizarHora aceita "10am"', () => {
  assert.equal(normalizarHora('10am'), '10:00');
});

test('normalizarHora aceita "8:30am"', () => {
  assert.equal(normalizarHora('8:30am'), '08:30');
});

test('normalizarHora aceita "às 14:00"', () => {
  assert.equal(normalizarHora('às 14:00'), '14:00');
});

test('normalizarHora retorna null para hora invalida > 23', () => {
  assert.equal(normalizarHora('25:00'), null);
});

test('normalizarHora retorna null para entrada nula', () => {
  assert.equal(normalizarHora(null), null);
});

// ─── normalizarData — formatos extras ────────────────────────────────────────

test('normalizarData aceita separador hifen DD-MM-YYYY', () => {
  assert.equal(normalizarData('21-04-2026'), '2026-04-21');
});

test('normalizarData aceita ISO ja normalizado', () => {
  assert.equal(normalizarData('2026-04-21'), '2026-04-21');
});

test('normalizarData retorna null para string sem padrão', () => {
  assert.equal(normalizarData('amanhã'), null);
});

test('normalizarData retorna null para null', () => {
  assert.equal(normalizarData(null), null);
});

// ─── normalizarDataRelativa — extras ─────────────────────────────────────────

test('normalizarDataRelativa resolve "depois de amanha"', () => {
  const ref = new Date('2026-05-07T12:00:00Z');
  assert.equal(normalizarDataRelativa('depois de amanha', ref), '2026-05-09');
});

test('normalizarDataRelativa resolve proxima segunda', () => {
  const ref = new Date('2026-05-07T12:00:00Z'); // quinta
  const resultado = normalizarDataRelativa('proxima segunda', ref);
  assert.match(resultado, /^\d{4}-\d{2}-\d{2}$/);
  const dia = new Date(resultado + 'T00:00:00');
  assert.equal(dia.getUTCDay(), 1); // segunda = 1
});

test('normalizarDataRelativa resolve "dia 15" para proximo mes se ja passou', () => {
  const ref = new Date('2026-05-20T12:00:00Z');
  const resultado = normalizarDataRelativa('dia 15', ref);
  assert.match(resultado, /^\d{4}-06-15$/);
});

test('normalizarDataRelativa retorna null para texto nao reconhecido', () => {
  assert.equal(normalizarDataRelativa('semana que vem', new Date()), null);
});

// ─── normalizarObjetoIA ───────────────────────────────────────────────────────

test('normalizarObjetoIA normaliza todos os campos em uma chamada', () => {
  const obj = {
    tipoManutencao: 'preventiva',
    unidadeTexto: '  CASSEMS  ',
    equipamentoTexto: '  Tomógrafo  ',
    data: '21/04/2026',
    horaInicio: '14h',
    horaFim: '16h',
    numeroChamado: 42,
    descricao: '  Revisão periódica  ',
    confirmacao: true,
  };
  const resultado = normalizarObjetoIA(obj);
  assert.equal(resultado.tipoManutencao, 'Preventiva');
  assert.equal(resultado.unidadeTexto, 'CASSEMS');
  assert.equal(resultado.equipamentoTexto, 'Tomógrafo');
  assert.equal(resultado.data, '2026-04-21');
  assert.equal(resultado.horaInicio, '14:00');
  assert.equal(resultado.horaFim, '16:00');
  assert.equal(resultado.numeroChamado, '42');
  assert.equal(resultado.descricao, 'Revisão periódica');
  assert.equal(resultado.confirmacao, true);
});

test('normalizarObjetoIA aceita campo "tipo" como alias de tipoManutencao', () => {
  const resultado = normalizarObjetoIA({ tipo: 'corretiva' });
  assert.equal(resultado.tipoManutencao, 'Corretiva');
});

test('normalizarObjetoIA retorna null para confirmacao nao booleana', () => {
  const resultado = normalizarObjetoIA({ confirmacao: 'sim' });
  assert.equal(resultado.confirmacao, null);
});

// ─── mesclarPreferindoIAComFallback ───────────────────────────────────────────

test('mesclarPreferindoIAComFallback prefere valor da IA quando nao nulo', () => {
  const ia = { tipoManutencao: 'Preventiva', data: null };
  const heuristica = { tipoManutencao: 'Corretiva', data: '2026-05-20' };
  const resultado = mesclarPreferindoIAComFallback(ia, heuristica);
  assert.equal(resultado.tipoManutencao, 'Preventiva');
});

test('mesclarPreferindoIAComFallback usa fallback quando IA retorna null', () => {
  const ia = { tipoManutencao: null, data: null, horaInicio: null };
  const heuristica = { tipoManutencao: null, data: '2026-05-20', horaInicio: '09:00' };
  const resultado = mesclarPreferindoIAComFallback(ia, heuristica);
  assert.equal(resultado.data, '2026-05-20');
  assert.equal(resultado.horaInicio, '09:00');
});

test('mesclarPreferindoIAComFallback retorna null quando ambos sao null', () => {
  const ia = { tipoManutencao: null };
  const heuristica = { tipoManutencao: null };
  const resultado = mesclarPreferindoIAComFallback(ia, heuristica);
  assert.equal(resultado.tipoManutencao, null);
});
