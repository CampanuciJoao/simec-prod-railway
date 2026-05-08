import prisma from '../prismaService.js';

const CDX_URL     = 'https://cx-us-prd-services.cloud.gehealthcare.com/la-prd-shared-services-cdx-api-gateway';
const REFRESH_URL = 'https://www.gehealthcare.com.br/api/v1/RefreshToken';

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function refreshTokens(refreshToken) {
  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`RefreshToken falhou: ${res.status}`);
  return res.json(); // { access_token, id_token }
}

function buildHeaders(accessToken, idToken) {
  return {
    'Content-Type':  'application/json',
    'accesstoken':   accessToken,
    'idtoken':       idToken,
    'Origin':        'https://www.gehealthcare.com.br',
    'Referer':       'https://www.gehealthcare.com.br/',
  };
}

async function query(graphqlQuery, variables, { accessToken, idToken }) {
  const res = await fetch(CDX_URL, {
    method:  'POST',
    headers: buildHeaders(accessToken, idToken),
    body:    JSON.stringify({ query: graphqlQuery, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
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

export async function fetchServiceHistory({ assetId, accessToken, idToken, maxRows = 200 }) {
  const allItems = [];
  let cursorMark = '';
  const rows = 50;

  while (true) {
    const data = await query(QUERY_SERVICE_EVENTS, {
      queryContext: {
        experienceFiltering: true,
        filter: {
          assetIds:          [assetId],
          serviceStateCodes: ['ST01', 'ST02', 'ST03', 'ST04', 'ST05'],
          serviceTypeCodes:  ['SE03', 'SE05'],
        },
        pageOffset: { cursorMark, rows },
        sort: { requestedDateTime: 'desc' },
      },
    }, { accessToken, idToken });

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

export async function fetchUptimeData({ assetId, accessToken, idToken }) {
  const data = await query(QUERY_UPTIME, { assetId }, { accessToken, idToken });
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

export async function fetchUtilizationData({ assetId, accessToken, idToken, diasRetroativos = 90 }) {
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
  }, { accessToken, idToken });

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

export async function fetchAssetCoverage({ assetId, accessToken, idToken }) {
  const data = await query(QUERY_COVERAGE, { assetId }, { accessToken, idToken });
  return data?.asset ?? null;
}

// ─── Query: saúde do equipamento ─────────────────────────────────────────────
// Aguardando captura da query real da aba Saúde via interceptor DevTools.
// Para capturar: cole o interceptor no Console, navegue até a aba "Saúde"
// do equipamento no portal GE, depois execute: copy(JSON.stringify(window._cdxCalls, null, 2))

export async function fetchEquipmentHealth({ assetId, accessToken, idToken }) {
  // TODO: completar com a query real capturada da aba Saúde (hélio, pressão, compressor)
  return null;
}

// ─── Query: lista de equipamentos da conta ────────────────────────────────────

const QUERY_ASSETS = `
  query getAssets {
    assetsV2 {
      items: assets {
        id
        equipmentId
        model
        modality
        productDescription
        installDate
        connectivityEnabled
        displayHealthSection
        physicalLocationAccount {
          accountName
          city
          region
          country
        }
        physicalLocationAddress {
          accountName
          city
          country
        }
        manufacturing { manufacturer }
        lifecycle {
          status
          endOfGuaranteedService { endOfServiceLifeDate }
        }
      }
    }
  }
`;

export async function fetchAllAssets({ accessToken, idToken }) {
  const data = await query(QUERY_ASSETS, {}, { accessToken, idToken });
  return data?.assetsV2?.items ?? [];
}
