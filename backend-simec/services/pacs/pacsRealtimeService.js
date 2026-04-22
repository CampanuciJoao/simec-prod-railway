function buildRoom(tenantId, userId) {
  return `tenant:${tenantId}:user:${userId}`;
}

export function emitirEventoTestePacs({
  tenantId,
  userId,
  connectionId,
  status,
  message,
  finishedAt = null,
}) {
  if (!global.io || !tenantId || !userId) return;

  global.io.to(buildRoom(tenantId, userId)).emit('pacs:connection-test', {
    connectionId,
    status,
    message,
    finishedAt,
  });
}

export function buildPacsSocketRoom(tenantId, userId) {
  return buildRoom(tenantId, userId);
}
