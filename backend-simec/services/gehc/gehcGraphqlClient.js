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
    'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
}

async function query(graphqlQuery, variables, { accessToken, idToken }) {
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
    throw new Error(`GE API HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

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

export async function fetchEquipmentHealth({ systemId, accessToken, idToken }) {
  const data = await query(QUERY_EQUIPMENT_HEALTH, { systemId }, { accessToken, idToken });
  const h = data?.equipmentHealth;
  if (!h) return null;

  return {
    heliumLevelPct:    h.magnetHealth?.heliumLevel?.currentValue     ?? null,
    heliumPressurePsi: h.magnetHealth?.heliumPressure?.currentValue  ?? null,
    compressorStatus:  h.compressorHealth?.statusValue               ?? null,
    coolantTempC:      h.magnetHealth?.chillerTemperature?.currentValue ?? null,
    coolantFlowGpm:    h.magnetHealth?.chillerWaterFlow?.currentValue ?? null,
    cryocoolerStatus:  h.cryoCoolerStatus?.statusValue               ?? null,
    magnetOnline:      h.magnetHealth?.magnetStatus?.toUpperCase() === 'ONLINE',
    _raw:              h,
  };
}

export async function fetchAssetConnectivity({ systemId, accessToken, idToken }) {
  const data = await query(QUERY_ASSET_CONNECTIVITY, { systemId }, { accessToken, idToken });
  const c = data?.assetConnectivity;
  if (!c) return null;
  return {
    equipmentOnline: c.status?.toUpperCase() === 'ONLINE',
    lastUpOn:        c.lastUpOn ?? null,
  };
}

// ─── Query: lista de equipamentos da conta ────────────────────────────────────

const QUERY_ASSETS = `
  query getAssets {
    assetsV2 {
      items: assets {
        id
        equipmentId
        systemId
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
