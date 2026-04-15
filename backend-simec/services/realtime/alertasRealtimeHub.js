const clientsByUserKey = new Map();

function buildUserKey(tenantId, userId) {
  return `${tenantId}:${userId}`;
}

function addClient({ tenantId, userId, res }) {
  const key = buildUserKey(tenantId, userId);

  if (!clientsByUserKey.has(key)) {
    clientsByUserKey.set(key, new Set());
  }

  clientsByUserKey.get(key).add(res);

  return () => {
    const bucket = clientsByUserKey.get(key);
    if (!bucket) return;

    bucket.delete(res);

    if (bucket.size === 0) {
      clientsByUserKey.delete(key);
    }
  };
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastToUser({ tenantId, userId, event, data }) {
  const key = buildUserKey(tenantId, userId);
  const bucket = clientsByUserKey.get(key);

  if (!bucket || bucket.size === 0) return;

  for (const res of bucket) {
    sendEvent(res, event, data);
  }
}

module.exports = {
  addClient,
  sendEvent,
  broadcastToUser,
};