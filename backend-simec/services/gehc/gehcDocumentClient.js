// Cliente GraphQL para o gateway CDX do GE Healthcare.
//
// A query `getDocumentSearch` retorna a lista de documentos (PDFs) disponíveis
// para uma OS, INCLUINDO o `documentUrl` final do PDF (Salesforce REST ou
// API GE direta — depende de `documentSource`). NÃO é necessário chamar
// `downloadDocument` separadamente — essa é só telemetria do portal
// (retorna 202 Accepted sem URL nova). Captura ao vivo em 2026-05-16
// confirmou que basta essa query para localizar e baixar os PDFs.
//
// Endpoints de download retornados em `documentUrl`:
//   - documentSource '101' → Salesforce REST
//     (gehealthcare-svc.my.salesforce.com/.../ContentVersion/<id>/VersionData)
//   - documentSource '102' → API GE direta
//     (prod-api.gehealthcare.com/health/smaxCdrSIMS/fileDownload?fileUuid=...)
//
// Schema da query e headers confirmados via captura ao vivo do portal real
// (DevTools/Network) em 4 OSs independentes — RM e CT, corretiva e PM.
// Ver [[03 - Engenharia/Arquitetura/GE Healthcare - Diagnostico tecnico do portal de PDFs]]
//
// IMPORTANTE: a API espera `serviceRequestNumber` (que é o serviceTrackingNumber
// no nosso schema, ex: "17159687") — NAO o `gehcServiceId` UUID (ex:
// "500Ur00000fLPDaIAO"). Quem chama precisa passar o tracking number correto.

const CDX_URL = 'https://cx-us-prd-services.cloud.gehealthcare.com/la-prd-shared-services-cdx-api-gateway';

const QUERY_DOCUMENT_SEARCH = `
  query getDocumentSearch($serviceRequestNumber: String!, $source: String!, $documentType: [String!]!, $locale: String!) {
    documentSearch(
      serviceRequestNumber: $serviceRequestNumber
      source: $source
      documentType: $documentType
      locale: $locale
    ) {
      status
      results {
        totalCount
        downloadHandlerType
        documents {
          id
          name
          documentUrl
          documentType
          documentSize
          documentSource
          source
          servicerequestid
        }
      }
    }
  }
`;

// Tipos de documento que o portal busca por padrao — cobre tanto PMs (planejadas)
// quanto corretivas (nao planejadas). Mesma lista usada pelo portal real.
const DOCUMENT_TYPES_PADRAO = ['Preventive Maintenance Form', 'Service Report'];

// Gera UUID v4 (para o header x-request-id — o portal envia um novo por request).
function uuidV4() {
  // crypto.randomUUID() é disponivel em Node >= 14.17. Fallback simples por
  // garantia caso o runtime nao tenha.
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function buildHeaders(accessToken, idToken) {
  return {
    'accept':       '*/*',
    'Content-Type': 'application/json',
    'accesstoken':  accessToken,
    'idtoken':      idToken,
    'source':       'desktop',
    'x-request-id': uuidV4(),
    'Origin':       'https://www.gehealthcare.com.br',
    'Referer':      'https://www.gehealthcare.com.br/',
    'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Retry com backoff progressivo. O gateway GE falha intermitentemente em
// produção — captura ao vivo viu ApolloError 'Timeout exceeded' no front
// legitimo do portal. 3 tentativas + backoff 1s/3s/10s cobre os casos
// transitorios sem prolongar muito a captura.
const RETRY_BACKOFF_MS = [1_000, 3_000, 10_000];
const MAX_TENTATIVAS = 3;
const REQUEST_TIMEOUT_MS = 30_000;

async function tentarFetch(payload, accessToken, idToken) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(CDX_URL, {
      method:  'POST',
      headers: buildHeaders(accessToken, idToken),
      body:    JSON.stringify(payload),
      signal:  controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Lista documentos disponíveis para uma OS GE no portal, com retry.
 * Retorna array vazio se a OS não tem documentos publicados ainda.
 *
 * Cada documento contém TUDO o que o downloader precisa para baixar:
 *   - documentId, fileName, documentType, documentSize
 *   - documentSource ('101' Salesforce | '102' API GE)
 *   - documentUrl (endpoint direto do PDF, depende do source)
 *
 * @param {object} args
 * @param {string} args.serviceRequestNumber - tracking number da OS (ex: "17159687")
 * @param {string} args.accessToken
 * @param {string} args.idToken
 * @param {string} [args.source='SERVICEMAX']
 * @param {string[]} [args.documentTypes] - tipos a buscar (default: PM + Service Report)
 * @param {string} [args.locale='pt-br']
 */
export async function listarDocumentosDaOS({
  serviceRequestNumber,
  accessToken,
  idToken,
  source = 'SERVICEMAX',
  documentTypes = DOCUMENT_TYPES_PADRAO,
  locale = 'pt-br',
}) {
  if (!serviceRequestNumber) {
    throw new Error('serviceRequestNumber obrigatorio (use o tracking number da OS, ex: "17159687")');
  }
  if (!accessToken || !idToken) {
    throw new Error('accessToken e idToken obrigatorios');
  }

  const payload = {
    operationName: 'getDocumentSearch',
    query:         QUERY_DOCUMENT_SEARCH,
    variables: {
      serviceRequestNumber: String(serviceRequestNumber),
      source,
      documentType: documentTypes,
      locale,
    },
  };

  let ultimoErro;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    if (tentativa > 1) {
      await sleep(RETRY_BACKOFF_MS[tentativa - 1]);
    }

    let res;
    try {
      res = await tentarFetch(payload, accessToken, idToken);
    } catch (err) {
      // Network errors / timeout / DNS
      ultimoErro = new Error(`documentSearch inacessivel: ${err.message}`);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // 401/403: token expirou — nao adianta retry, deve renovar antes
      if (res.status === 401 || res.status === 403) {
        throw new Error(`documentSearch HTTP ${res.status} (auth): ${body.slice(0, 200)}`);
      }
      // 5xx: tenta retry
      if (res.status >= 500 || res.status === 429) {
        ultimoErro = new Error(`documentSearch HTTP ${res.status}: ${body.slice(0, 200)}`);
        continue;
      }
      // 4xx outros: payload errado, nao adianta retry
      throw new Error(`documentSearch HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json().catch(() => ({}));
    if (json.errors?.length) {
      const msg = json.errors[0]?.message || 'erro desconhecido';
      // Timeout do gateway é transient — retry
      if (/timeout/i.test(msg)) {
        ultimoErro = new Error(`documentSearch GraphQL: ${msg}`);
        continue;
      }
      throw new Error(`documentSearch GraphQL: ${msg}`);
    }

    const documents = json?.data?.documentSearch?.results?.documents || [];
    return documents.map((d) => ({
      documentId:     d.id,
      fileName:       d.name,
      documentType:   d.documentType,
      documentSize:   d.documentSize,
      documentSource: d.documentSource,  // '101' Salesforce | '102' API GE
      documentUrl:    d.documentUrl,     // endpoint direto do PDF
      source:         d.source,          // SERVICEMAX (sistema de origem)
    }));
  }

  throw ultimoErro || new Error('documentSearch falhou apos retries');
}

export const DOCUMENT_TYPES_PADRAO_EXPORT = DOCUMENT_TYPES_PADRAO;
