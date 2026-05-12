// Cliente GraphQL específico para descoberta dos documentos (PDFs) de uma OS GE.
// O download em si NÃO é feito pelo GraphQL — após a `documentDownload` mutation
// retornar 202 (assíncrono), o portal renderiza um popup com link para uma URL
// S3 pré-assinada que entrega o PDF. Por isso o download de fato precisa do
// Playwright (gehcDocumentDownloader.js).
//
// Esta função existe para que possamos saber, antes de abrir o browser:
//   - Quantos PDFs cada OS tem (algumas têm 1, outras 2 ou mais)
//   - Quais são seus IDs canônicos (documentId, ex: "069Ur00000YSvPeIAL")
//   - Tipo de documento (ex: "Service Report")
//
// Útil para idempotência: marcamos como já baixado pelo documentId e nunca
// duplicamos.

const CDX_URL = 'https://cx-us-prd-services.cloud.gehealthcare.com/la-prd-shared-services-cdx-api-gateway';

const QUERY_DOCUMENT_SEARCH = `
  query documentSearch($queryContext: DocumentSearchQuery!) {
    documentSearch(queryContext: $queryContext) {
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

function buildHeaders(accessToken, idToken) {
  return {
    'Content-Type': 'application/json',
    'accesstoken':  accessToken,
    'idtoken':      idToken,
    'Origin':       'https://www.gehealthcare.com.br',
    'Referer':      'https://www.gehealthcare.com.br/',
    'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
}

/**
 * Lista documentos disponíveis para uma OS GE no portal.
 * Retorna [] se a OS não tem documentos publicados ainda.
 */
export async function listarDocumentosDaOS({
  serviceRequestId,
  accessToken,
  idToken,
}) {
  const variables = {
    queryContext: {
      serviceRequestId: String(serviceRequestId),
    },
  };

  let res;
  try {
    res = await fetch(CDX_URL, {
      method:  'POST',
      headers: buildHeaders(accessToken, idToken),
      body:    JSON.stringify({
        operationName: 'documentSearch',
        query:         QUERY_DOCUMENT_SEARCH,
        variables,
      }),
    });
  } catch (err) {
    throw new Error(`GE documentSearch inacessível: ${err.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GE documentSearch HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json().catch(() => ({}));
  if (json.errors?.length) {
    throw new Error(`GE documentSearch GraphQL: ${json.errors[0]?.message || 'erro desconhecido'}`);
  }

  const documents = json?.data?.documentSearch?.results?.documents || [];
  return documents.map((d) => ({
    documentId:   d.id,
    fileName:     d.name,
    documentType: d.documentType,
    documentSize: d.documentSize,
    source:       d.source,
  }));
}
