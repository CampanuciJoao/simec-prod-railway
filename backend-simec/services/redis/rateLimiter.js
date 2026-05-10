import { getSharedRedisClient, isSharedRedisUnavailable } from './sharedRedisClient.js';

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

export async function checkRateLimit(key, { maxAttempts, windowMs }) {
  const redis = getSharedRedisClient();

  if (redis && !isSharedRedisUnavailable()) {
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

export async function resetRateLimit(key) {
  const redis = getSharedRedisClient();

  if (redis && !isSharedRedisUnavailable()) {
    try {
      await redis.del(`rl:${key}`);
      return;
    } catch {
      // silencioso — fallback abaixo
    }
  }

  memoryBuckets.delete(key);
}
