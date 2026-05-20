// Testes de unidade para apoliceMatcher.
// Cobertura: helpers de normalização (sem Prisma).
// As funções casarUnidade/casarEquipamento dependem de DB e devem ser
// testadas em integração à parte.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizarCep,
  normalizarTexto,
} from '../../services/seguros/apoliceMatcher.js';

test('normalizarCep aceita CEP com hífen', () => {
  assert.equal(normalizarCep('01310-100'), '01310-100');
});

test('normalizarCep aceita CEP só números', () => {
  assert.equal(normalizarCep('01310100'), '01310-100');
});

test('normalizarCep tolera espaços e pontos', () => {
  assert.equal(normalizarCep('01.310-100'), '01310-100');
  assert.equal(normalizarCep(' 01310 100 '), '01310-100');
});

test('normalizarCep devolve null para CEP curto', () => {
  assert.equal(normalizarCep('1234'), null);
});

test('normalizarCep devolve null para CEP longo', () => {
  assert.equal(normalizarCep('012345678'), null);
});

test('normalizarCep devolve null para vazio/null/undefined', () => {
  assert.equal(normalizarCep(null), null);
  assert.equal(normalizarCep(undefined), null);
  assert.equal(normalizarCep(''), null);
});

test('normalizarTexto remove acentos e baixa-caixa', () => {
  assert.equal(normalizarTexto('São Paulo'), 'são paulo'.normalize('NFD').replace(/[̀-ͯ]/g, ''));
  // Forma direta:
  assert.equal(normalizarTexto('Avenida Paulista'), 'avenida paulista');
  assert.equal(normalizarTexto('Açúcar'), 'acucar');
});

test('normalizarTexto colapsa whitespace nas extremidades', () => {
  assert.equal(normalizarTexto('   ABC   '), 'abc');
});

test('normalizarTexto aceita vazio/null sem quebrar', () => {
  assert.equal(normalizarTexto(null), '');
  assert.equal(normalizarTexto(undefined), '');
  assert.equal(normalizarTexto(''), '');
});

test('normalizarTexto converte números para string', () => {
  assert.equal(normalizarTexto(123), '123');
});
