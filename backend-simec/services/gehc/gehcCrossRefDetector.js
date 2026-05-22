// Detecta referencias cruzadas a outras OSs/cases dentro do texto livre de
// um relatorio de servico GEHC. Padroes da pratica da GE:
//
//   "case 17232723"         -> referencia a outro Case
//   "case: 17232723"
//   "case # 17232723"
//   "SR17232723"            -> Service Request (UI do portal — case com prefixo)
//   "WO-18945191"           -> Work Order
//   "WO 18945191"
//   "WO18624085"
//   "# WO18624085"
//   "@ 17070838"            -> aparece em frase tipo "WO-XXXX @ NNNNNNNN"
//                             onde o numero apos @ tambem eh case number
//
// O resultado eh uma lista com {tipo, numero, match}. Quem chama decide
// como resolver contra o DB (matchar contra caseNumber/woNumber).

// Padrao mais permissivo possivel sem capturar lixo:
//   numero tem 7-9 digitos (cases GE rodam nessa faixa)
const REGEX_CASES = [
  // "case 12345678", "case: 12345678", "case # 12345678", "case#12345678"
  /\bcase\s*[#:]?\s*(\d{7,9})\b/gi,
  // "SR12345678" (sem espaco — formato do portal)
  /\bSR\s*(\d{7,9})\b/g,
  // "@ 12345678" (referencia indireta apos WO ou apos contexto de case)
  /[@#]\s*(\d{7,9})\b/g,
  // ServReq e variantes
  /\bServReq[_\s-]?(\d{7,9})\b/gi,
];

const REGEX_WO = [
  /\bWO[-\s_]?(\d{6,9})\b/gi,
];

/**
 * Extrai todas as referencias cruzadas (case/WO/SR) do texto.
 * Deduplica por (tipo, numero) — o mesmo case mencionado 2x conta 1.
 * Retorna lista vazia se texto invalido.
 */
export function detectarReferenciasCruzadas(textos = []) {
  const corpus = (Array.isArray(textos) ? textos : [textos])
    .filter(Boolean)
    .join(' \n ');
  if (!corpus) return [];

  const refs = new Map(); // chave: tipo|numero, valor: { tipo, numero, match }

  for (const padrao of REGEX_CASES) {
    let m;
    padrao.lastIndex = 0;
    while ((m = padrao.exec(corpus)) !== null) {
      const numero = m[1];
      const chave = `case|${numero}`;
      if (!refs.has(chave)) {
        refs.set(chave, { tipo: 'case', numero, match: m[0].trim() });
      }
    }
  }

  for (const padrao of REGEX_WO) {
    let m;
    padrao.lastIndex = 0;
    while ((m = padrao.exec(corpus)) !== null) {
      const numero = m[1];
      const chave = `wo|${numero}`;
      if (!refs.has(chave)) {
        refs.set(chave, { tipo: 'wo', numero, match: m[0].trim() });
      }
    }
  }

  return Array.from(refs.values());
}

/**
 * Resolve uma lista de referencias contra o banco do tenant: para cada
 * ref, busca se existe GehcPdfExtraido com caseNumber ou woNumber igual.
 * Retorna a lista enriquecida com:
 *   - encontradoNoSistema: bool
 *   - pdfExtraidoId, gehcServiceId, rootCauseCategory, status (quando encontrado)
 *
 * Importante: scope por tenantId — nunca devolve match cross-tenant.
 */
export async function resolverReferencias({ prisma, tenantId, refs, pdfExtraidoIdAtual = null }) {
  if (!refs?.length) return [];

  const cases = refs.filter((r) => r.tipo === 'case').map((r) => r.numero);
  const wos   = refs.filter((r) => r.tipo === 'wo').map((r) => r.numero);

  const orQuery = [];
  if (cases.length) orQuery.push({ caseNumber: { in: cases } });
  if (wos.length)   orQuery.push({ woNumber:   { in: wos } });
  if (!orQuery.length) return refs.map((r) => ({ ...r, encontradoNoSistema: false }));

  const matches = await prisma.gehcPdfExtraido.findMany({
    where: {
      tenantId,
      OR: orQuery,
      // Nao devolve a si mesmo se a ref aparecer no proprio texto
      ...(pdfExtraidoIdAtual ? { NOT: { id: pdfExtraidoIdAtual } } : {}),
    },
    select: {
      id: true,
      caseNumber: true,
      woNumber: true,
      rootCauseCategory: true,
      extraidoEm: true,
      pdfDocumento: {
        select: {
          documentId: true,
          ordemServico: {
            select: { gehcServiceId: true, serviceTypeCode: true },
          },
        },
      },
    },
  });

  // Indexa matches por case/wo para lookup rapido
  const porCase = new Map();
  const porWo   = new Map();
  for (const m of matches) {
    if (m.caseNumber) porCase.set(m.caseNumber, m);
    if (m.woNumber)   porWo.set(m.woNumber, m);
  }

  return refs.map((r) => {
    const m = r.tipo === 'case' ? porCase.get(r.numero) : porWo.get(r.numero);
    if (!m) return { ...r, encontradoNoSistema: false };
    return {
      ...r,
      encontradoNoSistema: true,
      pdfExtraidoId:    m.id,
      caseNumberMatch:  m.caseNumber,
      woNumberMatch:    m.woNumber,
      rootCauseCategory: m.rootCauseCategory,
      gehcServiceId:    m.pdfDocumento?.ordemServico?.gehcServiceId || null,
      serviceTypeCode:  m.pdfDocumento?.ordemServico?.serviceTypeCode || null,
      documentId:       m.pdfDocumento?.documentId || null,
    };
  });
}
