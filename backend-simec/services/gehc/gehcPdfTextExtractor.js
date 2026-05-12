// Camada 1 da extracao: regex sobre o texto cru do PDF de OS GE.
// Os PDFs gerados pelo Salesforce/ServiceMax tem estrutura semi-fixa em
// portugues, com rotulos consistentes:
//
//   Numero do Caso: 17159687
//   Tipo do Servico: Corrective Repair
//   Data de abertura do Caso: 25/03/2026 08:13
//   Status do Equipmento: System Running
//   System ID: MRR11625
//   Numero do Serial: 11625
//   WO-18713413
//   Engenheiro: Julio Marques
//   Problema descrito pelo Cliente: ...
//   Problema analisado pelo engenheiro: ...
//   Acoes tomadas: ...
//   Causa do problema: customer chiller - infra
//   Testes realizados: ...
//
// Variantes observadas: acentuacao pode vir corrompida ("Equipmento" sic),
// horas em formato 24h ou AM/PM, datas DD/MM/YYYY. Os regex sao tolerantes.
//
// Esta camada cobre ~80% do valor: causa_raiz_raw, status, engenheiro,
// horas. A camada 2 (LLM) so eh necessaria para normalizacao e medicoes.

import pdfParse from 'pdf-parse';
import crypto from 'crypto';

const EXTRACTOR_VERSION = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trim(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : null;
}

function trimMulti(s) {
  // Preserva quebras de linha simples mas colapsa espacos em branco.
  return typeof s === 'string' ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : null;
}

function parseDateBR(s) {
  if (!s) return null;
  // Aceita "25/03/2026 08:13" ou "25/03/2026 08:13 a.m." ou so "25/03/2026"
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?(?:\s*(a\.m\.|p\.m\.))?/i);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = '0', mi = '0', ampm] = m;
  let hour = parseInt(hh, 10);
  if (ampm?.toLowerCase().startsWith('p') && hour < 12) hour += 12;
  if (ampm?.toLowerCase().startsWith('a') && hour === 12) hour = 0;
  const d = new Date(Date.UTC(+yyyy, +mm - 1, +dd, hour, +mi));
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Regex builder ────────────────────────────────────────────────────────────

// Captura tudo entre o rotulo e o proximo rotulo conhecido (lookahead).
// Inclui o seguinte conjunto de rotulos como possiveis terminadores para
// nao "comer" o texto da proxima secao.
const NEXT_LABEL_LOOKAHEAD = `(?=\\n\\s*(?:N[uú]mero do Caso|Tipo do Servi[cç]o|Data de abertura|Status do Equip|CLIENTE|Nome do Site|INFORMA[CÇ][AÃ]O|System ID|S[eé]rie|S[eé]rial|Modalidade|UDI|Lot number|Sala\\/|SEGURAN[CÇ]A|Engenheiro|Problema descrito|Problema analisado|A[cç][oõ]es tomadas|Causa do problema|Testes realizados|HORAS DE TRABALHO|Tipo de Servi[cç]o|WO-\\d|$)|$)`;

function captureField(label, text) {
  // Permite acentos opcionais e pequenas variantes de encoding.
  const re = new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)${NEXT_LABEL_LOOKAHEAD}`, 'i');
  const m = text.match(re);
  return m?.[1] || null;
}

// ─── Extracao principal ───────────────────────────────────────────────────────

export async function extrairCamposDoPdf(pdfBuffer) {
  let text;
  try {
    const parsed = await pdfParse(pdfBuffer);
    text = parsed.text || '';
  } catch (err) {
    return { ok: false, erro: `pdf_parse_failed: ${err.message}` };
  }

  if (!text || text.length < 50) {
    return { ok: false, erro: 'pdf_text_vazio_ou_muito_curto' };
  }

  // Hash do texto para detectar mudancas em reprocessamentos
  const rawTextHash = crypto.createHash('sha256').update(text).digest('hex');

  const caseNumber       = trim(captureField('N[uú]mero do Caso', text));
  const serviceType      = trim(captureField('Tipo do Servi[cç]o', text));
  const openedAtRaw      = trim(captureField('Data de abertura do Caso', text));
  const equipmentStatus  = trim(captureField('Status do Equip(?:a)?mento', text));
  const systemId         = trim(captureField('System ID', text));
  const serialNumber     = trim(captureField('N[uú]mero do (?:S[eé]rial|Serial)', text));
  const engineerFullName = trim(captureField('Engenheiro', text));
  const problemReported  = trimMulti(captureField('Problema descrito pelo Cliente', text));
  const problemAnalyzed  = trimMulti(captureField('Problema analisado pelo engenheiro', text));
  const actionsTaken     = trimMulti(captureField('A[cç][oõ]es tomadas', text));
  const rootCauseRaw     = trim(captureField('Causa do problema', text));
  const testsPerformed   = trimMulti(captureField('Testes realizados', text));

  // WO-XXXXX vem isolado, sem rotulo "WO:".
  const woMatch = text.match(/\bWO[-\s]?(\d{6,})\b/);
  const woNumber = woMatch ? `WO-${woMatch[1]}` : null;

  // Total de minutos = soma das colunas "Total de Minutos" da tabela final.
  // Cada linha da tabela termina com um numero (minutos). Capturamos todos.
  const minutesMatches = [...text.matchAll(/Total de Minutos[\s\S]*?(?:\n|$)([\s\S]*?)(?=\n\s*(?:Tipo de Servi[cç]o|HORAS|$))/gi)];
  let totalMinutes = null;
  if (minutesMatches.length) {
    // Forma simplificada: somar todos os numeros isolados >= 0 que aparecem
    // depois do cabecalho "Total de Minutos". Pode ter falsos positivos em
    // PDFs muito atipicos — corrigimos no PR seguinte se preciso.
    const nums = (minutesMatches[0][1] || '').match(/\b\d{1,4}\b/g) || [];
    totalMinutes = nums.reduce((acc, n) => acc + parseInt(n, 10), 0) || null;
  }

  return {
    ok: true,
    rawTextHash,
    extractorVersion: EXTRACTOR_VERSION,
    campos: {
      caseNumber,
      woNumber,
      serviceType,
      equipmentStatus,
      systemId,
      serialNumber,
      engineerFullName,
      problemReported,
      problemAnalyzed,
      actionsTaken,
      rootCauseRaw,
      testsPerformed,
      totalMinutes,
      openedAt: parseDateBR(openedAtRaw),
    },
    rawText: text,
  };
}

export const REGEX_EXTRACTOR_VERSION = EXTRACTOR_VERSION;
