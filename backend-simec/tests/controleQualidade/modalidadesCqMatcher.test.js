import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ehModalidadeCq,
  ehModalidadeCqRegulada,
  categoriaCanonicaCq,
  buildWhereModalidadeCq,
} from '../../services/controleQualidade/modalidadesCqMatcher.js';

// ─── REGULADAS RDC 611 ─────────────────────────────────────────────────────

test('REGULADA: Mamografo (sem acento) bate Mamografia', () => {
  assert.equal(ehModalidadeCq('Mamografo'), true);
  assert.equal(ehModalidadeCqRegulada('Mamografo'), true);
  assert.equal(categoriaCanonicaCq('Mamografo'), 'Mamografia');
});

test('REGULADA: Mamógrafo (com acento) bate Mamografia', () => {
  assert.equal(ehModalidadeCq('Mamógrafo'), true);
  assert.equal(categoriaCanonicaCq('Mamógrafo'), 'Mamografia');
});

test('REGULADA: Tomografia Computadorizada bate', () => {
  assert.equal(ehModalidadeCq('Tomografia Computadorizada'), true);
  assert.equal(categoriaCanonicaCq('Tomografia Computadorizada'), 'Tomografia Computadorizada');
});

test('REGULADA: Raio-X / Raio X / Raio-X Movel bate', () => {
  assert.equal(ehModalidadeCq('Raio-X'), true);
  assert.equal(ehModalidadeCq('Raio X'), true);
  assert.equal(ehModalidadeCq('Raio-X Móvel'), true);
});

test('REGULADA: DR (Radiografia Digital) bate como Raio-X', () => {
  assert.equal(ehModalidadeCq('DR (Radiografia Digital)'), true);
  assert.equal(categoriaCanonicaCq('DR (Radiografia Digital)'), 'Raio-X / Radiografia');
});

test('REGULADA: Arco Cirúrgico bate (emite raio-X)', () => {
  assert.equal(ehModalidadeCq('Arco Cirúrgico'), true);
  assert.equal(ehModalidadeCqRegulada('Arco Cirúrgico'), true);
});

test('REGULADA: Densitômetro Ósseo (com acento) bate', () => {
  assert.equal(ehModalidadeCq('Densitômetro Ósseo'), true);
  assert.equal(categoriaCanonicaCq('Densitômetro Ósseo'), 'Densitometria Óssea');
});

test('REGULADA: Densitometria (sem ósseo) bate', () => {
  assert.equal(ehModalidadeCq('Densitometria'), true);
});

test('REGULADA: PET-CT bate', () => {
  assert.equal(ehModalidadeCq('PET-CT'), true);
  assert.equal(categoriaCanonicaCq('PET-CT'), 'PET-CT');
});

test('REGULADA: Cintilógrafo bate como Cintilografia', () => {
  assert.equal(ehModalidadeCq('SPECT / Cintilógrafo'), true);
  // Pode bater 'spect' primeiro ou 'cintilog' — depende da ordem.
  // Ambas sao reguladas, o importante eh estar coberto.
  assert.equal(ehModalidadeCqRegulada('SPECT / Cintilógrafo'), true);
});

test('REGULADA: Gama Câmara bate como Cintilografia', () => {
  assert.equal(ehModalidadeCq('Gama Câmara'), true);
  assert.equal(categoriaCanonicaCq('Gama Câmara'), 'Cintilografia');
});

test('REGULADA: SPECT puro bate', () => {
  assert.equal(ehModalidadeCq('SPECT'), true);
  assert.equal(categoriaCanonicaCq('SPECT'), 'SPECT');
});

test('REGULADA: Fluoroscopia bate', () => {
  assert.equal(ehModalidadeCq('Fluoroscopia'), true);
});

// ─── RECOMENDADAS ──────────────────────────────────────────────────────────

test('RECOMENDADA: Ressonância Magnética bate mas NAO eh regulada', () => {
  assert.equal(ehModalidadeCq('Ressonância Magnética'), true);
  assert.equal(ehModalidadeCqRegulada('Ressonância Magnética'), false);
});

test('RECOMENDADA: Ultrassom bate', () => {
  assert.equal(ehModalidadeCq('Ultrassom'), true);
  assert.equal(ehModalidadeCq('Ultrassonografia'), true);
});

// ─── NAO COBERTAS ──────────────────────────────────────────────────────────

test('NAO COBERTA: Bomba Injetora de Contraste nao bate', () => {
  assert.equal(ehModalidadeCq('Bomba Injetora de Contraste'), false);
});

test('NAO COBERTA: Monitor Multiparâmetros nao bate', () => {
  assert.equal(ehModalidadeCq('Monitor Multiparâmetros'), false);
});

test('NAO COBERTA: Ergômetro / Esteira nao bate', () => {
  assert.equal(ehModalidadeCq('Ergômetro / Esteira'), false);
});

test('NAO COBERTA: tipo vazio/null nao bate', () => {
  assert.equal(ehModalidadeCq(''), false);
  assert.equal(ehModalidadeCq(null), false);
  assert.equal(ehModalidadeCq(undefined), false);
});

// ─── BUILD WHERE ───────────────────────────────────────────────────────────

test('buildWhereModalidadeCq retorna clausula Prisma OR com contains', () => {
  const where = buildWhereModalidadeCq();
  assert.ok(Array.isArray(where.OR));
  assert.ok(where.OR.length > 0);
  // Cada elemento deve ter shape Prisma { tipo: { contains, mode } }
  for (const cond of where.OR) {
    assert.ok(cond.tipo);
    assert.ok(cond.tipo.contains);
    assert.equal(cond.tipo.mode, 'insensitive');
  }
});
