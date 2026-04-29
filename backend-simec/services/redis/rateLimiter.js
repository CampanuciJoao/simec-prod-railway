import IORedis from 'ioredis';
import { getRedisConnectionOptions } from './redisConnectionOptions.js';

let client = null;
let unavailable = false;

function getClient() {
  if (unavailable) return null;
  if (client) return client;

  client = new IORedis({
    ...getRedisConnectionOptions(),
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

  client.on('error', (err) => {
    if (!unavailable) {
      console.warn('[RATE_LIMITER] Redis indisponível — usando fallback in-memory:', err.message);
      unavailable = true;
    }
  });

  return client;
}

// Fallback in-memory para quando o Redis não está disponível
const memoryBuckets = new Map();

function getMemoryState(key, windowMs) {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    const fresh = { count: 0, expiresAt: now + windowMs };
    memoryBuckets.set(key, fresh);
    return fresh;
  }
  return current;
}

/**
 * Verifica e incrementa o contador de tentativas.
 * Retorna { limited: boolean, remaining: number, retryAfterSeconds: number }
 */
export async function checkRateLimit(key, { maxAttempts, windowMs }) {
  const redis = getClient();

  if (redis && !unavailable) {
    try {
      const redisKey = `rl:${key}`;
      const windowSec = Math.ceil(windowMs / 1000);

      const count = await redis.incr(redisKey);

      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }

      const ttl = await redis.ttl(redisKey);
      const retryAfterSeconds = Math.max(0, ttl);

      if (count > maxAttempts) {
        return { limited: true, remaining: 0, retryAfterSeconds };
      }

      return { limited: false, remaining: maxAttempts - count, retryAfterSeconds: 0 };
    } catch (err) {
      console.warn('[RATE_LIMITER] Erro Redis — caindo para in-memory:', err.message);
    }
  }

  const state = getMemoryState(key, windowMs);
  state.count += 1;
  memoryBuckets.set(key, state);

  const retryAfterSeconds = Math.ceil(Math.max(0, state.expiresAt - Date.now()) / 1000);

  if (state.count > maxAttempts) {
    return { limited: true, remaining: 0, retryAfterSeconds };
  }

  return { limited: false, remaining: maxAttempts - state.count, retryAfterSeconds: 0 };
}

/**
 * Reseta o contador de tentativas após sucesso.
 */
export async function resetRateLimit(key) {
  const redis = getClient();

  if (redis && !unavailable) {
    try {
      await redis.del(`rl:${key}`);
      return;
    } catch {
      // silencioso — fallback abaixo
    }
  }

  memoryBuckets.delete(key);
}
