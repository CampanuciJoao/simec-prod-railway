// Testes de unidade para gehcPdfTextExtractor.
// Foco: parser de datas brasileiras (DD/MM/YYYY com variantes), que é
// crítico pra timeline de OS GEHC e tolera diferentes formatos.
//
// extrairCamposDoPdf depende de pdf-parse (PDF real). Cobertura desse
// caminho fica para integração com fixtures.

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDateBR } from '../../services/gehc/gehcPdfTextExtractor.js';

test('parseDateBR aceita DD/MM/YYYY HH:MM', () => {
  const d = parseDateBR('25/03/2026 08:13');
  assert.ok(d instanceof Date);
  assert.equal(d.getUTCFullYear(), 2026);
  assert.equal(d.getUTCMonth(), 2); // 0-indexed
  assert.equal(d.getUTCDate(), 25);
  assert.equal(d.getUTCHours(), 8);
  assert.equal(d.getUTCMinutes(), 13);
});

test('parseDateBR aceita data sem horário', () => {
  const d = parseDateBR('25/03/2026');
  assert.ok(d instanceof Date);
  assert.equal(d.getUTCFullYear(), 2026);
  assert.equal(d.getUTCMonth(), 2);
  assert.equal(d.getUTCDate(), 25);
  assert.equal(d.getUTCHours(), 0);
});

test('parseDateBR aceita formato AM/PM (p.m.)', () => {
  const d = parseDateBR('25/03/2026 01:30 p.m.');
  assert.equal(d.getUTCHours(), 13);
  assert.equal(d.getUTCMinutes(), 30);
});

test('parseDateBR aceita formato AM/PM (a.m.)', () => {
  const d = parseDateBR('25/03/2026 09:00 a.m.');
  assert.equal(d.getUTCHours(), 9);
});

test('parseDateBR trata meia-noite 12 a.m. como 0h', () => {
  const d = parseDateBR('25/03/2026 12:00 a.m.');
  assert.equal(d.getUTCHours(), 0);
});

test('parseDateBR aceita dia/mês de um dígito', () => {
  const d = parseDateBR('5/3/2026 8:13');
  assert.equal(d.getUTCDate(), 5);
  assert.equal(d.getUTCMonth(), 2);
  assert.equal(d.getUTCHours(), 8);
});

test('parseDateBR ignora texto antes e depois da data', () => {
  // O parser usa match, então texto extra ao redor não deve quebrar.
  const d = parseDateBR('Aberto em 25/03/2026 08:13 BRT');
  assert.ok(d instanceof Date);
  assert.equal(d.getUTCDate(), 25);
});

test('parseDateBR retorna null para string sem data', () => {
  assert.equal(parseDateBR('sem data aqui'), null);
});

test('parseDateBR retorna null para vazio/null/undefined', () => {
  assert.equal(parseDateBR(null), null);
  assert.equal(parseDateBR(undefined), null);
  assert.equal(parseDateBR(''), null);
});
