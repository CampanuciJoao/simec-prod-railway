import crypto from 'crypto';
import { invalidarTokensGehc, obterTokensGehc } from './gehcAuthService.js';

const CDX_URL = 'https://cx-us-prd-services.cloud.gehealthcare.com/la-prd-shared-services-cdx-api-gateway';

// Deduplicação de renovação de tokens por tenant — evita múltiplos Playwright simultâneos
const renovacaoPorTenant = new Map();

// Headers atualizados em 2026-06-30 com base em captura ao vivo do portal real:
//   - Origin/Referer pos-migracao: gehealthcare.com (sem .br)
//   - User-Agent: Chrome 149 (era 124 — desatualizado)
//   - source: 'desktop' — confirmado em todas as requests CDX do portal
//   - x-request-id: UUID v4 fresh por request — confirmado idem
function buildHeaders(accessToken, idToken) {
  return {
    'accept':        '*/*',
    'Content-Type':  'application/json',
    'accesstoken':   accessToken,
    'idtoken':       idToken,
    'source':        'desktop',
    'x-request-id':  crypto.randomUUID(),
    'Origin':        'https://www.gehealthcare.com',
    'Referer':       'https://www.gehealthcare.com/pt-br/account/myequipment',
    'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  };
}

function ehErroDeAutenticacaoGehc(status, body = '', errors = []) {
  if (status === 401 || status === 403) return true;

  const bodyText = String(body || '').toLowerCase();
  if (
    bodyText.includes('jwt expired') ||
    bodyText.includes('authentication_error') ||
    bodyText.includes('unauthorized')
  ) {
    return true;
  }

  return errors.some((error) => {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.extensions?.code || '').toUpperCase();
    return (
      message.includes('jwt expired') ||
      message.includes('unauthorized') ||
      code === 'AUTHENTICATION_ERROR'
    );
  });
}

async function repetirComNovosTokens(graphqlQuery, variables, tenantId) {
  console.warn(`[GEHC_GQL] Token expirado para tenant ${tenantId} — renovando autenticação e repetindo query.`);

  if (!renovacaoPorTenant.has(tenantId)) {
    const renovacao = (async () => {
      await invalidarTokensGehc(tenantId);
      return obterTokensGehc(tenantId);
    })().finally(() => renovacaoPorTenant.delete(tenantId));
    renovacaoPorTenant.set(tenantId, renovacao);
  } else {
    console.log(`[GEHC_GQL] Aguardando renovação de token já em andamento para tenant ${tenantId}.`);
  }

  const novosTokens = await renovacaoPorTenant.get(tenantId);
  return query(graphqlQuery, variables, {
    ...novosTokens,
    tenantId,
    retryingAuth: true,
  });
}

async function query(graphqlQuery, variables, { accessToken, idToken, tenantId = null, retryingAuth = false }) {
  let res;
  try {
    res = await fetch(CDX_URL, {
      method:  'POST',
      headers: buildHeaders(accessToken, idToken),
      body:    JSON.stringify({ query: graphqlQuery, variables }),
    });
  } catch (err) {
    throw new Error(`GE API inacessível: ${err.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (!retryingAuth && tenantId && ehErroDeAutenticacaoGehc(res.status, body)) {
      return repetirComNovosTokens(graphqlQuery, variables, tenantId);
    }
    throw new Error(`GE API HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  if (json.errors) {
    if (!retryingAuth && tenantId && ehErroDeAutenticacaoGehc(res.status, '', json.errors)) {
      return repetirComNovosTokens(graphqlQuery, variables, tenantId);
    }
    throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  }
  return json.data;
}

// ─── Query: histórico de serviço (OS) ────────────────────────────────────────

const QUERY_SERVICE_EVENTS = `
  query assetRecentEvents($queryContext: ServiceEventsQuery!) {
    collection: serviceEventsV2(queryContext: $queryContext) {
      totalRows
      nextCursorMark
      rows
      items: serviceEvents {
        id
        problemDescription
        serviceTrackingNumber
        engineerTypeCode
        serviceTypeCode
        serviceStateCode
        serviceSubStateCode
        serviceStateMessageCode
        requestedDateTime
        dueDate
        scheduledDate
        isOverDue
        serviceStateDateTime
        requester { fullName }
        activitiesV2(queryContext: { sort: { startedDateTime: desc } }) {
          id
          activityStatus
          activityType
          correctiveAction
          startedDateTime
          startedWorkingDateTime
          engineer { engineerFirstName engineerLastName }
          timeSheetsV2 { id startDate endDate }
        }
        assetV2 {
          id
          equipmentId
          model
          modality
          productDescription
          installDate
        }
        srAssetIdV2
        serviceRequestStatus
      }
    }
  }
`;

export async function fetchServiceHistory({ assetId, accessToken, idToken, tenantId = null, maxRows = 200 }) {
  const allItems = [];
  let cursorMark = '';
  const rows = 50;
  let curAccessToken = accessToken;
  let curIdToken = idToken;

  while (true) {
    // Entre páginas, relê tokens do DB para pegar tokens renovados pelo retry da página anterior
    if (tenantId && cursorMark !== '') {
      try {
        const fresh = await obterTokensGehc(tenantId);
        curAccessToken = fresh.accessToken;
        curIdToken = fresh.idToken;
      } catch { /* mantém tokens existentes */ }
    }

    const data = await query(QUERY_SERVICE_EVENTS, {
      queryContext: {
        experienceFiltering: true,
        filter: {
          assetIds:          [assetId],
          serviceStateCodes: ['ST01', 'ST02', 'ST03', 'ST04', 'ST05'],
          // SE02 = preventiva (PM), SE03/SE05 = corretiva. Importamos as três
          // para alimentar o Knowledge Layer da IA com o histórico completo.
          serviceTypeCodes:  ['SE02', 'SE03', 'SE05'],
        },
        pageOffset: { cursorMark, rows },
        sort: { requestedDateTime: 'desc' },
      },
    }, { accessToken: curAccessToken, idToken: curIdToken, tenantId });

    const items = data?.collection?.items ?? [];
    allItems.push(...items);

    const next = data?.collection?.nextCursorMark;
    if (!next || next === cursorMark || allItems.length >= maxRows) break;
    cursorMark = next;
  }

  return allItems;
}

// ─── Query: uptime do equipamento ────────────────────────────────────────────

const QUERY_UPTIME = `
  query uptimeAggregate($assetId: ID!) {
    uptime(assetId: $assetId) {
      assetId
      contractUptimeAggregate
      clockSdiUptimeAggregate
      clockUptimeAggregate
      uptimeMonthlyAggregates {
        aggregateDate
        contractUptime
        clockSdiUptime
        clockUptime
      }
    }
  }
`;

export async function fetchUptimeData({ assetId, accessToken, idToken, tenantId = null }) {
  const data = await query(QUERY_UPTIME, { assetId }, { accessToken, idToken, tenantId });
  return data?.uptime ?? null;
}

// ─── Query: utilização do equipamento ────────────────────────────────────────

const QUERY_UTILIZATION = `
  query utilizationAggregate($queryContext: UtilizationAggregateQuery!) {
    utilization(queryContext: $queryContext) {
      assetId
      patientsAggregate {
        averagePerDay
        monthlyAggregates {
          patientsCount
          aggregateDate
        }
      }
      examsAggregate {
        averagePerDay
        monthlyAggregates {
          examsCount
          aggregateDate
        }
      }
      examsDurationAggregate {
        averagePerExam
        monthlyAggregates {
          examsDurationTotal
          aggregateDate
        }
      }
    }
  }
`;

export async function fetchUtilizationData({ assetId, accessToken, idToken, tenantId = null, diasRetroativos = 90 }) {
  const endDate   = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - diasRetroativos);

  const data = await query(QUERY_UTILIZATION, {
    queryContext: {
      assetId,
      filter: {
        USTargetRegion: false,
        endDate:   endDate.toISOString(),
        startDate: startDate.toISOString(),
      },
    },
  }, { accessToken, idToken, tenantId });

  return data?.utilization ?? null;
}

// ─── Query: cobertura contratual ──────────────────────────────────────────────

const QUERY_COVERAGE = `
  query assetCoverage($assetId: String!) {
    asset(assetId: $assetId) {
      id
      equipmentId
      model
      connectivityEnabled
      displayHealthSection
      coverage {
        warranty {
          warrantyStatusCode
          warrantyExpirationDate
        }
        contractDetails {
          contractName
          contractStatusCode
          contractStartDate
          contractExpirationDate
          contractEntitlements {
            contractEntitlement
            contractEntitlementDescription
          }
        }
        coverageInfo {
          displayHealth
        }
      }
      assetCoverageType
    }
  }
`;

export async function fetchAssetCoverage({ assetId, accessToken, idToken, tenantId = null }) {
  const data = await query(QUERY_COVERAGE, { assetId }, { accessToken, idToken, tenantId });
  return data?.asset ?? null;
}

// ─── Query: saúde do equipamento (aba Saúde — hélio, pressão, compressor) ─────

const QUERY_EQUIPMENT_HEALTH = `
  query equipmentHealth($systemId: String) {
    equipmentHealth(systemId: $systemId) {
      systemId
      compressorHealth {
        statusValue
        statusDate
      }
      cryoCoolerStatus {
        statusValue
        statusDate
      }
      magnetHealth {
        magnetStatus
        chillerWaterFlow {
          unit
          lastUpdated
          currentValue
        }
        chillerTemperature {
          unit
          lastUpdated
          currentValue
        }
        heliumLevel {
          unit
          lastUpdated
          currentValue
        }
        heliumPressure {
          unit
          lastUpdated
          currentValue
        }
      }
    }
  }
`;

const QUERY_ASSET_CONNECTIVITY = `
  query assetConnectivity($systemId: String!) {
    assetConnectivity(systemId: $systemId) {
      systemId
      status
      lastUpOn
    }
  }
`;

export async function fetchEquipmentHealth({ systemId, accessToken, idToken, tenantId = null }) {
  const data = await query(QUERY_EQUIPMENT_HEALTH, { systemId }, { accessToken, idToken, tenantId });
  const h = data?.equipmentHealth;
  if (!h) return null;

  const toFloat = v => v !== null && v !== undefined ? parseFloat(v) || null : null;

  return {
    heliumLevelPct:    toFloat(h.magnetHealth?.heliumLevel?.currentValue),
    heliumPressurePsi: toFloat(h.magnetHealth?.heliumPressure?.currentValue),
    compressorStatus:  h.compressorHealth?.statusValue                   ?? null,
    coolantTempC:      toFloat(h.magnetHealth?.chillerTemperature?.currentValue),
    coolantFlowGpm:    toFloat(h.magnetHealth?.chillerWaterFlow?.currentValue),
    cryocoolerStatus:  h.cryoCoolerStatus?.statusValue                   ?? null,
    magnetOnline:      h.magnetHealth?.magnetStatus?.toUpperCase() === 'ONLINE',
    _raw:              h,
  };
}

export async function fetchAssetConnectivity({ systemId, accessToken, idToken, tenantId = null }) {
  const data = await query(QUERY_ASSET_CONNECTIVITY, { systemId }, { accessToken, idToken, tenantId });
  const c = data?.assetConnectivity;
  if (!c) return null;
  return {
    equipmentOnline: c.status?.toUpperCase() === 'ONLINE',
    lastUpOn:        c.lastUpOn ?? null,
  };
}

// ─── Query: lista de equipamentos da conta ────────────────────────────────────
// Schema: assets(queryContext: {pageOffset: {cursorMark, rows}}) { totalRows nextCursorMark assets { ... } }
// Confirmado via engenharia reversa (introspection desabilitada no CDX).

export async function fetchAllAssets({ accessToken, idToken, tenantId = null, maxRows = 500 }) {
  const allAssets = [];
  let cursorMark = '';
  const rows = 100;
  let curAccessToken = accessToken;
  let curIdToken = idToken;

  while (true) {
    // Entre páginas, relê tokens do DB para pegar tokens renovados pelo retry da página anterior
    if (tenantId && cursorMark !== '') {
      try {
        const fresh = await obterTokensGehc(tenantId);
        curAccessToken = fresh.accessToken;
        curIdToken = fresh.idToken;
      } catch { /* mantém tokens existentes */ }
    }

    const data = await query(
      `query {
        assets(queryContext: {pageOffset: {cursorMark: "${cursorMark}", rows: ${rows}}}) {
          totalRows
          nextCursorMark
          assets { id equipmentId systemId model modality productDescription }
        }
      }`,
      {},
      { accessToken: curAccessToken, idToken: curIdToken, tenantId }
    );

    const page = data?.assets?.assets ?? [];
    allAssets.push(...page);

    const next = data?.assets?.nextCursorMark;
    if (!next || next === cursorMark || page.length === 0 || allAssets.length >= maxRows) break;
    cursorMark = next;
  }

  console.log(`[GEHC_GQL] fetchAllAssets: ${allAssets.length} asset(s) obtidos.`);
  return allAssets;
}
