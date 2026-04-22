import axios from 'axios';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new IORedis(redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
});

const ALLOWED_TAGS = [
  '00080020',
  '00080030',
  '00080021',
  '00080031',
  '00080060',
  '00081010',
  '00080054',
  '00080070',
  '00081090',
  '00081030',
  '00201206',
  '00201208',
  '00080080',
];

const REQUEST_GAP_MS = 200;
const BREAKER_FAILURE_LIMIT = 5;
const BREAKER_TTL_SECONDS = 30 * 60;

const requestState = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function sanitizeSummaryError(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.statusText ||
    error?.message ||
    'PACS_REQUEST_ERROR'
  );
}

function buildHeaders(credentials = {}) {
  const headers = {
    Accept: 'application/dicom+json, application/json',
  };

  if (credentials.apiKey) {
    headers.Authorization = `Bearer ${credentials.apiKey}`;
  }

  if (credentials.username && credentials.password) {
    const basic = Buffer.from(
      `${credentials.username}:${credentials.password}`
    ).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  return headers;
}

async function waitForRateLimit(connectionId) {
  const now = Date.now();
  const nextAllowedAt = requestState.get(connectionId) || 0;
  const waitMs = Math.max(0, nextAllowedAt - now);

  if (waitMs > 0) {
    await sleep(waitMs);
  }

  requestState.set(connectionId, Date.now() + REQUEST_GAP_MS);
}

function getBreakerKey(tenantId, connectionId) {
  return `pacs:circuit:${tenantId}:${connectionId}`;
}

async function getBreakerState(tenantId, connectionId) {
  const raw = await redis.get(getBreakerKey(tenantId, connectionId));
  return raw ? JSON.parse(raw) : { state: 'closed', failures: 0 };
}

async function setBreakerState(tenantId, connectionId, state) {
  await redis.set(
    getBreakerKey(tenantId, connectionId),
    JSON.stringify(state),
    'EX',
    BREAKER_TTL_SECONDS
  );
}

async function beforeRequest(tenantId, connectionId) {
  const breaker = await getBreakerState(tenantId, connectionId);

  if (breaker.state === 'open') {
    throw new Error('PACS_CIRCUIT_OPEN');
  }

  if (breaker.state === 'half-open') {
    return breaker;
  }

  return breaker;
}

async function onRequestSuccess(tenantId, connectionId) {
  await setBreakerState(tenantId, connectionId, {
    state: 'closed',
    failures: 0,
  });
}

async function onRequestFailure(tenantId, connectionId) {
  const breaker = await getBreakerState(tenantId, connectionId);
  const failures = Number(breaker.failures || 0) + 1;
  const state = failures >= BREAKER_FAILURE_LIMIT ? 'open' : 'closed';

  await setBreakerState(tenantId, connectionId, {
    state,
    failures,
  });

  if (state === 'open') {
    setTimeout(() => {
      setBreakerState(tenantId, connectionId, {
        state: 'half-open',
        failures,
      }).catch(() => {});
    }, BREAKER_TTL_SECONDS * 1000);
  }
}

function formatDicomDateTime(date = '', time = '') {
  const cleanDate = String(date || '').replace(/[^\d]/g, '');
  const cleanTime = String(time || '').replace(/[^\d.]/g, '');

  if (cleanDate.length !== 8) return null;

  const year = cleanDate.slice(0, 4);
  const month = cleanDate.slice(4, 6);
  const day = cleanDate.slice(6, 8);
  const hh = cleanTime.slice(0, 2) || '00';
  const mm = cleanTime.slice(2, 4) || '00';
  const ss = cleanTime.slice(4, 6) || '00';

  return new Date(`${year}-${month}-${day}T${hh}:${mm}:${ss}.000Z`);
}

function extractDicomValue(study, tag) {
  const node = study?.[tag];
  if (!node || !Array.isArray(node.Value) || node.Value.length === 0) {
    return null;
  }

  const value = node.Value[0];

  if (typeof value === 'object' && value !== null && 'Alphabetic' in value) {
    return value.Alphabetic || null;
  }

  return value ?? null;
}

function extractIntValue(study, tag) {
  const value = Number(extractDicomValue(study, tag));
  return Number.isFinite(value) ? value : 0;
}

function normalizeStudy(study) {
  const studyDate = extractDicomValue(study, '00080020');
  const studyTime = extractDicomValue(study, '00080030');
  const seriesDate = extractDicomValue(study, '00080021');
  const seriesTime = extractDicomValue(study, '00080031');

  return {
    startedAt: formatDicomDateTime(studyDate, studyTime),
    endedAt:
      formatDicomDateTime(seriesDate, seriesTime) ||
      formatDicomDateTime(studyDate, studyTime),
    modality: String(extractDicomValue(study, '00080060') || '').trim() || null,
    stationName:
      String(extractDicomValue(study, '00081010') || '').trim() || null,
    aeTitle:
      String(extractDicomValue(study, '00080054') || '').trim().toUpperCase() ||
      null,
    manufacturer:
      String(extractDicomValue(study, '00080070') || '').trim() || null,
    manufacturerModelName:
      String(extractDicomValue(study, '00081090') || '').trim() || null,
    studyDescription:
      String(extractDicomValue(study, '00081030') || '').trim() || null,
    numberOfSeries: extractIntValue(study, '00201206'),
    numberOfInstances: extractIntValue(study, '00201208'),
    institutionName:
      String(extractDicomValue(study, '00080080') || '').trim() || null,
  };
}

export class PacsClient {
  constructor(config = {}) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.connectionId = config.connectionId || 'default';
    this.tenantId = config.tenantId || 'default';
    this.timeout = config.timeout || 10000;
    this.credentials = config.credentials || {};
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: buildHeaders(this.credentials),
    });
  }

  async requestWithRetry(url, params = {}) {
    let lastError;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await beforeRequest(this.tenantId, this.connectionId);
        await waitForRateLimit(this.connectionId);

        const response = await this.http.get(url, { params });
        await onRequestSuccess(this.tenantId, this.connectionId);
        return response.data;
      } catch (error) {
        lastError = error;
        await onRequestFailure(this.tenantId, this.connectionId);

        if (attempt < 2) {
          await sleep(1000 * 2 ** attempt);
        }
      }
    }

    const wrapped = new Error(sanitizeSummaryError(lastError));
    wrapped.cause = lastError;
    throw wrapped;
  }

  async testConnection() {
    const now = new Date();
    const from = new Date(now.getTime() - 60 * 60 * 1000);
    await this.fetchStudies({
      from,
      to: now,
      pageSize: 1,
      highVolume: false,
    });
    return { ok: true };
  }

  async fetchStudies({
    from,
    to,
    highVolume = false,
    pageSize = 100,
  }) {
    if (!this.baseUrl) {
      throw new Error('PACS_NOT_CONFIGURED');
    }

    const results = [];
    const cursor = new Date(from);
    const end = new Date(to);
    const sliceMs = highVolume
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    while (cursor < end) {
      const nextCursor = new Date(
        Math.min(cursor.getTime() + sliceMs, end.getTime())
      );

      let offset = 0;
      let keepGoing = true;

      while (keepGoing) {
        const data = await this.requestWithRetry('/studies', {
          fuzzymatching: false,
          includefield: ALLOWED_TAGS,
          limit: pageSize,
          offset,
          StudyDate: `${cursor.toISOString().slice(0, 10).replace(/-/g, '')}-${nextCursor
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, '')}`,
        });

        const page = Array.isArray(data) ? data.map(normalizeStudy) : [];
        results.push(...page);

        if (page.length < pageSize) {
          keepGoing = false;
        } else {
          offset += pageSize;
        }
      }

      cursor.setTime(nextCursor.getTime());
    }

    return results.filter((study) => study.startedAt instanceof Date);
  }
}

export function createPacsClient(config) {
  return new PacsClient(config);
}
