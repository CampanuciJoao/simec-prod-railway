const clientsByUserKey = new Map();

function buildUserKey(tenantId, userId) {
  return `${tenantId}:${userId}`;
}

/**
 * 🔌 Adiciona cliente SSE
 */
function addClient({ tenantId, userId, res }) {
  const key = buildUserKey(tenantId, userId);

  if (!clientsByUserKey.has(key)) {
    clientsByUserKey.set(key, new Set());
  }

  const bucket = clientsByUserKey.get(key);
  bucket.add(res);

  /**
   * 🔥 limpeza automática ao fechar conexão
   */
  const cleanup = () => {
    const bucket = clientsByUserKey.get(key);
    if (!bucket) return;

    bucket.delete(res);

    if (bucket.size === 0) {
      clientsByUserKey.delete(key);
    }
  };

  res.on('close', cleanup);
  res.on('error', cleanup);

  return cleanup;
}

/**
 * 📡 Envia evento SSE
 */
function sendEvent(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    // evita crash silencioso
    try {
      res.end();
    } catch {}
  }
}

/**
 * 📢 Broadcast para um usuário
 */
function broadcastToUser({ tenantId, userId, event, data }) {
  const key = buildUserKey(tenantId, userId);
  const bucket = clientsByUserKey.get(key);

  if (!bucket || bucket.size === 0) return;

  for (const res of bucket) {
    sendEvent(res, event, data);
  }
}

/**
 * 🔥 Broadcast para todos do tenant
 */
function broadcastToTenant({ tenantId, event, data }) {
  for (const [key, bucket] of clientsByUserKey.entries()) {
    if (!key.startsWith(`${tenantId}:`)) continue;

    for (const res of bucket) {
      sendEvent(res, event, data);
    }
  }
}

/**
 * 💓 KeepAlive (evita timeout de proxy)
 */
function startHeartbeat(intervalMs = 25000) {
  setInterval(() => {
    for (const bucket of clientsByUserKey.values()) {
      for (const res of bucket) {
        try {
          res.write(`event: ping\ndata: {}\n\n`);
        } catch {}
      }
    }
  }, intervalMs);
}

module.exports = {
  addClient,
  sendEvent,
  broadcastToUser,
  broadcastToTenant,
  startHeartbeat,
};