import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizarTexto,
  tokenizar,
  similarity,
  expandirSinonimosEquipamento,
  avaliarCandidato,
  buildResolutionBase,
  resolveFromCandidates,
} from '../../services/agent/shared/entityScoring.js';

// ─── normalizarTexto ──────────────────────────────────────────────────────────

test('normalizarTexto converte para minúsculas', () => {
  assert.equal(normalizarTexto('TOMÓGRAFO'), 'tomografo');
});

test('normalizarTexto remove acentos', () => {
  assert.equal(normalizarTexto('Tomógrafo Computadorizado'), 'tomografo computadorizado');
});

test('normalizarTexto remove espaços externos', () => {
  assert.equal(normalizarTexto('  ECG  '), 'ecg');
});

test('normalizarTexto retorna string vazia para entrada vazia', () => {
  assert.equal(normalizarTexto(''), '');
});

test('normalizarTexto aceita numero como string', () => {
  assert.equal(normalizarTexto(123), '123');
});

// ─── tokenizar ────────────────────────────────────────────────────────────────

test('tokenizar divide por espaço', () => {
  assert.deepEqual(tokenizar('Unidade Matriz'), ['unidade', 'matriz']);
});

test('tokenizar divide por hífen', () => {
  assert.deepEqual(tokenizar('Raio-X'), ['raio', 'x']);
});

test('tokenizar divide por barra', () => {
  assert.deepEqual(tokenizar('TC/RM'), ['tc', 'rm']);
});

test('tokenizar remove tokens vazios', () => {
  const tokens = tokenizar('  a   b  ');
  assert.ok(tokens.every((t) => t.length > 0));
});

// ─── similarity ───────────────────────────────────────────────────────────────

test('similarity retorna 1 para strings identicas', () => {
  assert.equal(similarity('tomografo', 'tomografo'), 1);
});

test('similarity retorna 1 com acentos diferentes (normaliza)', () => {
  assert.equal(similarity('Tomógrafo', 'tomografo'), 1);
});

test('similarity retorna 0 para strings completamente diferentes', () => {
  const s = similarity('abc', 'xyz');
  assert.ok(s < 0.5);
});

test('similarity retorna 0 para string vazia', () => {
  assert.equal(similarity('', 'tomografo'), 0);
});

test('similarity e simetrico', () => {
  const ab = similarity('tomografo', 'tomografia');
  const ba = similarity('tomografia', 'tomografo');
  assert.equal(ab, ba);
});

test('similarity alta para palavras parecidas', () => {
  const s = similarity('tomografo', 'tomografia');
  assert.ok(s > 0.7);
});

// ─── expandirSinonimosEquipamento ─────────────────────────────────────────────

test('expandirSinonimosEquipamento expande TC para grupo tomografia', () => {
  const sinonimos = expandirSinonimosEquipamento('TC');
  assert.ok(sinonimos.includes('tomografia'));
  assert.ok(sinonimos.includes('tomografo'));
  assert.ok(sinonimos.includes('tc'));
  assert.ok(sinonimos.includes('ct'));
});

test('expandirSinonimosEquipamento expande "tomógrafo" para grupo TC', () => {
  const sinonimos = expandirSinonimosEquipamento('tomógrafo');
  assert.ok(sinonimos.includes('tc'));
  assert.ok(sinonimos.includes('tomografia computadorizada'));
});

test('expandirSinonimosEquipamento expande RX para grupo raio-x', () => {
  const sinonimos = expandirSinonimosEquipamento('RX');
  assert.ok(sinonimos.includes('raio x'));
  assert.ok(sinonimos.includes('radiografia'));
  assert.ok(sinonimos.includes('rx'));
});

test('expandirSinonimosEquipamento expande "ressonância" para grupo RM', () => {
  const sinonimos = expandirSinonimosEquipamento('ressonância');
  assert.ok(sinonimos.includes('rm'));
  assert.ok(sinonimos.includes('rnm'));
  assert.ok(sinonimos.includes('ressonancia magnetica'));
});

test('expandirSinonimosEquipamento expande US para grupo ultrassom', () => {
  const sinonimos = expandirSinonimosEquipamento('US');
  assert.ok(sinonimos.includes('ultrassom'));
  assert.ok(sinonimos.includes('ultrasonografia'));
});

test('expandirSinonimosEquipamento expande mamografia', () => {
  const sinonimos = expandirSinonimosEquipamento('mamografia');
  assert.ok(sinonimos.includes('mamografo'));
  assert.ok(sinonimos.includes('mammo'));
});

test('expandirSinonimosEquipamento retorna pelo menos o proprio texto para equipamento desconhecido', () => {
  const sinonimos = expandirSinonimosEquipamento('monitor multiparametro');
  assert.ok(sinonimos.length >= 1);
  assert.ok(sinonimos.includes('monitor multiparametro'));
});

test('expandirSinonimosEquipamento retorna array vazio para entrada vazia', () => {
  const sinonimos = expandirSinonimosEquipamento('');
  assert.deepEqual(sinonimos, []);
});

// ─── avaliarCandidato ─────────────────────────────────────────────────────────

test('avaliarCandidato retorna 1 para match exato', () => {
  assert.equal(avaliarCandidato('Tomógrafo Siemens', ['Tomógrafo Siemens']), 1);
});

test('avaliarCandidato retorna 0 para query vazia', () => {
  assert.equal(avaliarCandidato('', ['Tomógrafo Siemens']), 0);
});

test('avaliarCandidato retorna score alto para token exato dentro do campo', () => {
  const score = avaliarCandidato('Siemens', ['Tomógrafo Siemens SOMATOM Go.Up']);
  assert.ok(score >= 0.8);
});

test('avaliarCandidato retorna score baixo para query sem relacao', () => {
  const score = avaliarCandidato('Ventilador', ['Tomógrafo Siemens']);
  assert.ok(score < 0.5);
});

// ─── buildResolutionBase ──────────────────────────────────────────────────────

test('buildResolutionBase cria estrutura com status empty', () => {
  const base = buildResolutionBase('tomografo');
  assert.equal(base.status, 'empty');
  assert.equal(base.query, 'tomografo');
  assert.deepEqual(base.matches, []);
  assert.deepEqual(base.suggestions, []);
  assert.equal(base.confidence, 0);
});

test('buildResolutionBase aceita query nula', () => {
  const base = buildResolutionBase(null);
  assert.equal(base.query, null);
});

// ─── resolveFromCandidates ────────────────────────────────────────────────────

const candidatosUnidade = [
  { id: 'u1', nomeSistema: 'CASSEMS Campo Grande', cidade: 'Campo Grande' },
  { id: 'u2', nomeSistema: 'CASSEMS Coxim', cidade: 'Coxim' },
  { id: 'u3', nomeSistema: 'CASSEMS Dourados', cidade: 'Dourados' },
];

const toFields = (u) => [u.nomeSistema, u.cidade];
const toSuggestion = (u) => ({ id: u.id, label: u.nomeSistema });

test('resolveFromCandidates retorna resolved para match exato', () => {
  const res = resolveFromCandidates({
    query: 'CASSEMS Campo Grande',
    candidates: candidatosUnidade,
    toFields,
    toSuggestion,
  });
  assert.equal(res.status, 'resolved');
  assert.equal(res.matches[0].id, 'u1');
});

test('resolveFromCandidates retorna not_found para query sem correspondencia', () => {
  const res = resolveFromCandidates({
    query: 'Hospital das Clínicas',
    candidates: candidatosUnidade,
    toFields,
    toSuggestion,
  });
  assert.equal(res.status, 'not_found');
});

test('resolveFromCandidates retorna not_found para query vazia', () => {
  const res = resolveFromCandidates({
    query: '',
    candidates: candidatosUnidade,
    toFields,
    toSuggestion,
  });
  assert.equal(res.status, 'empty');
});

test('resolveFromCandidates inclui sugestoes mesmo em not_found se score > 0.42', () => {
  const res = resolveFromCandidates({
    query: 'Coxim',
    candidates: candidatosUnidade,
    toFields,
    toSuggestion,
  });
  assert.ok(res.suggestions.length > 0);
});

test('resolveFromCandidates retorna low_confidence quando match parcial com gap suficiente', () => {
  const candidatos = [
    { id: '1', nomeSistema: 'Unidade Matriz', cidade: 'Cuiaba' },
    { id: '2', nomeSistema: 'Unidade Centro', cidade: 'Cuiaba' },
  ];
  const res = resolveFromCandidates({
    query: 'Matriz',
    candidates: candidatos,
    toFields: (u) => [u.nomeSistema, u.cidade],
    toSuggestion: (u) => ({ id: u.id, label: u.nomeSistema }),
  });
  assert.equal(res.status, 'low_confidence');
  assert.equal(res.matches[0].label, 'Unidade Matriz');
});

test('resolveFromCandidates retorna ambiguous quando dois candidatos com scores proximos', () => {
  const candidatos = [
    { id: '1', nomeSistema: 'CASSEMS A', cidade: 'X' },
    { id: '2', nomeSistema: 'CASSEMS B', cidade: 'X' },
  ];
  const res = resolveFromCandidates({
    query: 'CASSEMS',
    candidates: candidatos,
    toFields: (u) => [u.nomeSistema],
    toSuggestion: (u) => ({ id: u.id, label: u.nomeSistema }),
  });
  assert.equal(res.status, 'ambiguous');
  assert.ok(res.matches.length >= 2);
});
