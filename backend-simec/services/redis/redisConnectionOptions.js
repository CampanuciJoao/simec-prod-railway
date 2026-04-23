function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL?.trim();

  const baseOptions = {
    host: process.env.REDIS_HOST?.trim() || '127.0.0.1',
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD?.trim() || undefined,
    username: process.env.REDIS_USERNAME?.trim() || undefined,
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
      // Many providers expose "default" in the URL even when legacy AUTH <password>
      // is the only accepted mode. Omitting that username keeps both setups working.
      username:
        baseOptions.username ||
        (usernameFromUrl && usernameFromUrl !== 'default'
          ? usernameFromUrl
          : undefined),
      tls: parsed.protocol === 'rediss:' ? {} : baseOptions.tls,
    };
  } catch {
    return {
      ...baseOptions,
      connectionName: 'simec-redis-fallback',
    };
  }
}

