import IORedis from 'ioredis';
import { getRedisConnectionOptions } from './redisConnectionOptions.js';

let client = null;
let unavailable = false;

export function getSharedRedisClient() {
  if (unavailable) return null;
  if (client) return client;

  client = new IORedis({
    ...getRedisConnectionOptions(),
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

  client.on('connect', () => {
    console.log('[REDIS] Cliente compartilhado conectado.');
  });

  client.on('error', (err) => {
    if (!unavailable) {
      console.warn('[REDIS] Cliente compartilhado indisponível — operações de cache degradadas:', err.message);
      unavailable = true;
    }
  });

  return client;
}

export function isSharedRedisUnavailable() {
  return unavailable;
}
