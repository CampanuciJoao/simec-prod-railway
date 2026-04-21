function truncateText(value, maxLength = 280) {
  if (typeof value !== 'string') return value;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function sanitizeError(error) {
  if (!error) return null;

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    code: error.code || null,
  };
}

function normalizeValue(value, depth = 0) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (depth > 4) {
    return '[max-depth]';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const normalizedEntries = Object.entries(value)
      .map(([key, item]) => [key, normalizeValue(item, depth + 1)])
      .filter(([, item]) => item !== undefined);

    return Object.fromEntries(normalizedEntries);
  }

  if (typeof value === 'string') {
    return truncateText(value);
  }

  return value;
}

export function buildAgentLogContext(baseContext = {}, details = {}) {
  return normalizeValue({
    requestId: baseContext.requestId || null,
    tenantId: baseContext.tenantId || null,
    usuarioId: baseContext.usuarioId || null,
    usuarioNome: baseContext.usuarioNome || null,
    sessionId: baseContext.sessionId || null,
    intent: baseContext.intent || null,
    ...details,
  });
}

export function logAgentStage(tag, baseContext = {}, details = {}) {
  const payload = buildAgentLogContext(baseContext, details);
  console.log(`[${tag}] ${JSON.stringify(payload)}`);
}

export function logAgentError(tag, error, baseContext = {}, details = {}) {
  const payload = buildAgentLogContext(baseContext, {
    ...details,
    error: sanitizeError(error),
  });
  console.error(`[${tag}] ${JSON.stringify(payload)}`);
}
