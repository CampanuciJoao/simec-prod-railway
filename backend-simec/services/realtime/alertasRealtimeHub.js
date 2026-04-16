const clientsByUserKey = new Map();

function buildUserKey(tenantId, userId) {
  return `${tenantId}:${userId}`;
}

export function addClient({ tenantId, userId, res }) {
  const key = buildUserKey(tenantId, userId);

  if (!clientsByUserKey.has(key)) {
    clientsByUserKey.set(key, new Set());
  }

  const bucket = clientsByUserKey.get(key);
  bucket.add(res);

  const cleanup = () => {
    const currentBucket = clientsByUserKey.get(key);
    if (!currentBucket) return;

    currentBucket.delete(res);

    if (currentBucket.size === 0) {
      clientsByUserKey.delete(key);
    }
  };

  res.on('close', cleanup);
  res.on('error', cleanup);

  return cleanup;
}

export function sendEvent(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    try {
      res.end();
    } catch {}
  }
}

export function broadcastToUser({ tenantId, userId, event, data }) {
  const key = buildUserKey(tenantId, userId);
  const bucket = clientsByUserKey.get(key);

  if (!bucket || bucket.size === 0) return;

  for (const res of bucket) {
    sendEvent(res, event, data);
  }
}

export function broadcastToTenant({ tenantId, event, data }) {
  for (const [key, bucket] of clientsByUserKey.entries()) {
    if (!key.startsWith(`${tenantId}:`)) continue;

    for (const res of bucket) {
      sendEvent(res, event, data);
    }
  }
}

export function startHeartbeat(intervalMs = 25000) {
  return setInterval(() => {
    for (const bucket of clientsByUserKey.values()) {
      for (const res of bucket) {
        try {
          res.write('event: ping\ndata: {}\n\n');
        } catch {}
      }
    }
  }, intervalMs);
}