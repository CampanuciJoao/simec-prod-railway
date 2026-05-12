// Cliente GraphQL específico para descoberta dos documentos (PDFs) de uma OS GE.
// O download em si NÃO é feito pelo GraphQL — após a `downloadDocument` mutation
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
//
// IMPORTANTE: a API espera `serviceRequestNumber` (que é o serviceTrackingNumber
// no nosso schema, ex: "17159687") — NAO o `gehcServiceId` UUID (ex:
// "500Ur00000fLPDaIAO"). Quem chama precisa passar o tracking number correto.
// Schema confirmado via captura do payload real do portal MyEquipment 360.

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

  const variables = {
    serviceRequestNumber: String(serviceRequestNumber),
    source,
    documentType: documentTypes,
    locale,
  };

  let res;
  try {
    res = await fetch(CDX_URL, {
      method:  'POST',
      headers: buildHeaders(accessToken, idToken),
      body:    JSON.stringify({
        operationName: 'getDocumentSearch',
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

export const DOCUMENT_TYPES_PADRAO_EXPORT = DOCUMENT_TYPES_PADRAO;
