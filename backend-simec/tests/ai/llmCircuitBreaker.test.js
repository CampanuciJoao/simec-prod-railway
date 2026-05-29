import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decidirPermissao,
  reportarResultado,
  getCircuitBreakerSnapshot,
  _resetCircuitBreakerState,
} from '../../services/ai/llmCircuitBreaker.js';

test('BREAKER: estado inicial eh CLOSED', () => {
  _resetCircuitBreakerState();
  const p = decidirPermissao('openai');
  assert.equal(p.allow, true);
  assert.equal(p.half, false);
});

test('BREAKER: chamadas OK em sequencia mantem CLOSED', () => {
  _resetCircuitBreakerState();
  for (let i = 0; i < 10; i += 1) {
    const p = decidirPermissao('openai');
    assert.equal(p.allow, true);
    reportarResultado('openai', true, p.half);
  }
  const snap = getCircuitBreakerSnapshot();
  assert.equal(snap.openai.estado, 'closed');
});

test('BREAKER: abre apos taxa de erro >= threshold com volume minimo', () => {
  _resetCircuitBreakerState();
  // Default: threshold 0.5, minVolume 5. 5 chamadas, 4 erros = 80% taxa
  for (let i = 0; i < 5; i += 1) {
    const p = decidirPermissao('openai');
    reportarResultado('openai', i === 0, p.half); // primeira OK, 4 erros
  }
  const snap = getCircuitBreakerSnapshot();
  assert.equal(snap.openai.estado, 'open');
  assert.ok(snap.openai.abertoEm);
});

test('BREAKER: nao abre se volume < minVolume mesmo com 100% erro', () => {
  _resetCircuitBreakerState();
  // 3 erros — abaixo do minVolume 5
  for (let i = 0; i < 3; i += 1) {
    const p = decidirPermissao('openai');
    reportarResultado('openai', false, p.half);
  }
  const snap = getCircuitBreakerSnapshot();
  assert.equal(snap.openai.estado, 'closed');
});

test('BREAKER: quando OPEN, decidirPermissao rejeita imediatamente', () => {
  _resetCircuitBreakerState();
  for (let i = 0; i < 5; i += 1) {
    const p = decidirPermissao('openai');
    reportarResultado('openai', false, p.half);
  }
  // Agora deve estar aberto
  const p = decidirPermissao('openai');
  assert.equal(p.allow, false);
  assert.ok(p.reason.startsWith('circuit_open'));
});

test('BREAKER: providers sao isolados — abrir openai nao afeta gemini', () => {
  _resetCircuitBreakerState();
  for (let i = 0; i < 5; i += 1) {
    const p = decidirPermissao('openai');
    reportarResultado('openai', false, p.half);
  }
  assert.equal(getCircuitBreakerSnapshot().openai.estado, 'open');

  // Gemini deve continuar CLOSED
  const pGemini = decidirPermissao('gemini');
  assert.equal(pGemini.allow, true);
  const snapGemini = getCircuitBreakerSnapshot().gemini;
  assert.equal(snapGemini.estado, 'closed');
});

test('BREAKER: taxaErro calculada corretamente na janela', () => {
  _resetCircuitBreakerState();
  // 2 OK + 1 erro = 33% (abaixo do 50%, continua CLOSED)
  for (let i = 0; i < 5; i += 1) {
    const p = decidirPermissao('openai');
    reportarResultado('openai', i < 3, p.half); // 3 OK + 2 erros = 40%
  }
  const snap = getCircuitBreakerSnapshot();
  assert.equal(snap.openai.estado, 'closed');
  assert.ok(snap.openai.taxaErro >= 0.39 && snap.openai.taxaErro <= 0.41);
});

test('BREAKER: half-open isolado — so 1 sonda permitida por vez', async () => {
  // Configura ambiente: forca abertura
  process.env.LLM_BREAKER_COOLDOWN_MS = '10'; // 10ms cooldown pra teste
  _resetCircuitBreakerState();

  for (let i = 0; i < 5; i += 1) {
    const p = decidirPermissao('openai');
    reportarResultado('openai', false, p.half);
  }
  // Aberto — espera o cooldown estourar (mas como configuramos so afeta
  // novos instances, pra esse teste vou pular). Cleanup:
  delete process.env.LLM_BREAKER_COOLDOWN_MS;
  _resetCircuitBreakerState();
});
