function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeRedisUsername(value) {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.toLowerCase() === 'default') {
    return undefined;
  }
  return normalized;
}

export function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL?.trim();

  const baseOptions = {
    host: process.env.REDIS_HOST?.trim() || '127.0.0.1',
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD?.trim() || undefined,
    username:
      process.env.REDIS_FORCE_USERNAME === 'true'
        ? process.env.REDIS_USERNAME?.trim() || undefined
        : sanitizeRedisUsername(process.env.REDIS_USERNAME),
    tls:
      process.env.REDIS_TLS === 'true' ||
      process.env.REDIS_TLS === '1' ||
      process.env.REDIS_URL?.startsWith('rediss://')
        ? {}
        : undefined,
  };

  if (!redisUrl) {
    return baseOptions;
  }

  try {
    const parsed = new URL(redisUrl);
    const usernameFromUrl = decodeURIComponent(parsed.username || '').trim();
    const passwordFromUrl = decodeURIComponent(parsed.password || '').trim();

    return {
      ...baseOptions,
      host: parsed.hostname || baseOptions.host,
      port: toInt(parsed.port, baseOptions.port),
      password: baseOptions.password || passwordFromUrl || undefined,
      username:
        baseOptions.username ||
        (process.env.REDIS_FORCE_USERNAME === 'true'
          ? usernameFromUrl || undefined
          : sanitizeRedisUsername(usernameFromUrl)),
      tls: parsed.protocol === 'rediss:' ? {} : baseOptions.tls,
    };
  } catch {
    return {
      ...baseOptions,
      connectionName: 'simec-redis-fallback',
    };
  }
}
