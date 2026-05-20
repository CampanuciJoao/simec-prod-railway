// Testes de unidade para apoliceExtractor.
// Sem PDF real e sem LLM: validamos só o contrato público (guards + erros
// tipados). A camada de PDF/IA é coberta por integração à parte.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ApoliceExtractorError,
  extrairApolice,
} from '../../services/seguros/apoliceExtractor.js';

test('ApoliceExtractorError carrega code + name corretos', () => {
  const err = new ApoliceExtractorError('ERR_PDF_PROTECTED', 'protegido');
  assert.equal(err.code, 'ERR_PDF_PROTECTED');
  assert.equal(err.name, 'ApoliceExtractorError');
  assert.equal(err.message, 'protegido');
  assert.ok(err instanceof Error, 'deve estender Error');
});

test('extrairApolice rejeita buffer ausente com ERR_INVALID_INPUT', async () => {
  await assert.rejects(
    extrairApolice(null),
    (err) => err.code === 'ERR_INVALID_INPUT' && err.name === 'ApoliceExtractorError'
  );
});

test('extrairApolice rejeita string em vez de Buffer com ERR_INVALID_INPUT', async () => {
  await assert.rejects(
    extrairApolice('não sou buffer'),
    (err) => err.code === 'ERR_INVALID_INPUT'
  );
});

test('extrairApolice rejeita Uint8Array (não-Buffer) com ERR_INVALID_INPUT', async () => {
  // Guarda explicita contra confusão entre Buffer e Uint8Array — apenas Buffer
  // é aceito na fronteira pública.
  await assert.rejects(
    extrairApolice(new Uint8Array([1, 2, 3])),
    (err) => err.code === 'ERR_INVALID_INPUT'
  );
});

test('extrairApolice em buffer não-PDF retorna ERR_PDF_PARSE ou ERR_PDF_EMPTY', async () => {
  // Bytes aleatórios — pdfjs deve falhar no parse. Aceita qualquer um dos
  // dois códigos: se parse falhar, ERR_PDF_PARSE; se passar mas texto vier
  // vazio, ERR_PDF_EMPTY. Ambos são contratos válidos pra fronteira.
  const buf = Buffer.from('isso aqui não é um PDF de verdade, é só lixo');
  await assert.rejects(
    extrairApolice(buf),
    (err) =>
      err.name === 'ApoliceExtractorError' &&
      ['ERR_PDF_PARSE', 'ERR_PDF_EMPTY'].includes(err.code)
  );
});
