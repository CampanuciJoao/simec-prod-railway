import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aguardarLimiteEReservar,
  getRateLimitSnapshot,
  _resetRateLimitState,
} from '../../services/ai/llmRateLimit.js';

// Os testes usam um provider customizado ("test_provider") que NAO esta
// na tabela CONFIGS — entao cai no fallback fail-open (sem limite).
// Pra testar limite real, vamos usar o provider "openai" e contar via
// snapshot — sem fazer chamadas reais (so reservar/release).

test('RATE_LIMIT: reservar incrementa inFlight', async () => {
  _resetRateLimitState();
  const h = await aguardarLimiteEReservar('openai');
  const snap = getRateLimitSnapshot();
  assert.equal(snap.openai.inFlight, 1);
  h.release();
});

test('RATE_LIMIT: release decrementa inFlight', async () => {
  _resetRateLimitState();
  const h1 = await aguardarLimiteEReservar('openai');
  const h2 = await aguardarLimiteEReservar('openai');
  assert.equal(getRateLimitSnapshot().openai.inFlight, 2);

  h1.release();
  assert.equal(getRateLimitSnapshot().openai.inFlight, 1);

  h2.release();
  assert.equal(getRateLimitSnapshot().openai.inFlight, 0);
});

test('RATE_LIMIT: windowCount conta chamadas na janela rolling', async () => {
  _resetRateLimitState();
  const h1 = await aguardarLimiteEReservar('openai');
  const h2 = await aguardarLimiteEReservar('openai');
  const h3 = await aguardarLimiteEReservar('openai');

  assert.equal(getRateLimitSnapshot().openai.windowCount, 3);

  h1.release();
  h2.release();
  h3.release();
});

test('RATE_LIMIT: provider desconhecido nao bloqueia (fail-open)', async () => {
  _resetRateLimitState();
  // 10 chamadas num provider sem config — todas passam imediatamente
  const handles = [];
  for (let i = 0; i < 10; i += 1) {
    const h = await aguardarLimiteEReservar('provider_inexistente');
    handles.push(h);
  }
  assert.equal(handles.length, 10);
  for (const h of handles) h.release();
});

test('RATE_LIMIT: concurrency limit bloqueia 6a chamada quando 5 estao em voo', async () => {
  _resetRateLimitState();
  const handles = [];
  for (let i = 0; i < 5; i += 1) {
    handles.push(await aguardarLimiteEReservar('openai'));
  }
  const snap = getRateLimitSnapshot();
  assert.equal(snap.openai.inFlight, 5);
  assert.equal(snap.openai.maxConcurrent, 5);

  // Libera todos antes do final
  for (const h of handles) h.release();
  assert.equal(getRateLimitSnapshot().openai.inFlight, 0);
});
