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

// v2: NEXT_LABEL_LOOKAHEAD expandido pra cobrir o formato ANTIGO da GE
// (com "Verificacao / Testes Realizados", "Horas", "Pecas", "Despesas",
// "Ferramenta", "Nro de Serie", footer "Relatorio de servico", "Caso N
// Page X of Y"). Antes o regex de "Causa do problema" nao tinha onde
// parar nesses PDFs e sugava o resto do documento, gerando rootCauseRaw
// gigante e ilegivel. Tambem afrouxa o boundary `\n\s*` para `\s*` —
// alguns PDFs vem comprimidos em poucas linhas e o newline nunca aparece.
const EXTRACTOR_VERSION = 2;

// Falha-segura: nenhum campo deveria passar disso em PDF normal. Trunca
// silenciosamente quando passa — sinal de regex runaway.
const TAMANHO_MAXIMO_CAMPO = 4000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trim(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : null;
}

function trimMulti(s) {
  // Preserva quebras de linha simples mas colapsa espacos em branco.
  return typeof s === 'string' ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : null;
}

export function parseDateBR(s) {
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
// Cobre 2 formatos da GE em produção:
//
//   Formato NOVO (relatorios pos-2025):
//     Causa do problema, Testes realizados, HORAS DE TRABALHO,
//     Tipo de Servico (header da tabela)
//
//   Formato ANTIGO (relatorios pre-2025 e alguns SE03 esporadicos):
//     Verificacao / Testes Realizados, Horas (header da tabela),
//     Pecas, Despesas, Ferramenta, Nro de Serie, footer
//     "Relatorio de servico Caso NNNNN Page X of Y", "Assinatura do Tecnico"
//
// Boundary afrouxado de `\n\s*` para `\s*` — alguns PDFs vem com texto
// comprimido em poucas linhas e o newline nunca aparece, fazendo a regex
// estourar ate o final do documento.
//
// Dois tipos de tokens, pra evitar falso match em texto livre:
//   1. LABELS_COM_DOIS_PONTOS: exigem `:` apos o rotulo (ex: "Causa do
//      problema:"). Sao os campos estruturados do relatorio.
//   2. SECTION_HEADERS: cabecalhos de secao/tabela que aparecem isolados,
//      sem `:`. Usam \b (word boundary) para nao casar em meio de palavra
//      (ex: "informacao" no texto livre nao deve casar com "INFORMACAO").

const LABELS_COM_DOIS_PONTOS = [
  // Cabecalho
  'N[uú]mero do Caso', 'Tipo do Servi[cç]o', 'Data de abertura', 'Status do Equip(?:a)?mento',
  'Nome do Site', 'System ID', 'S[eé]rie', 'S[eé]rial', 'Modalidade', 'UDI',
  'Lot number', 'Sala\\/ ?Departamento', 'Engenheiro', 'Nome do Contato',
  'Endere[cç]o', 'Nome do Cliente',
  // Formato NOVO
  'Problema descrito pelo Cliente', 'Problema analisado pelo engenheiro',
  'A[cç][oõ]es tomadas', 'Causa do problema', 'Testes realizados',
  // Formato ANTIGO
  'Problema Relatado', 'Problema Identificado', 'A[cç][aã]o realizada',
  'Causa do Problema',
  'Verifica[cç][aã]o\\s*\\/?\\s*Testes Realizados',
  'Nome T[eé]cnico', 'Data\\/Hora',
];

// Section headers EXIGEM contexto especifico (palavras posteriores ou
// formato distintivo) para nao casar em texto livre. Antes "CLIENTE" e
// "Horas" sozinhos casavam com "cliente." e "horas" em texto natural por
// causa do flag /i, truncando capturas no meio.
const SECTION_HEADERS = [
  // Cabeçalhos de seção do formato GE (sempre seguidos do nome completo)
  '\\bINFORMA[CÇ][AÃ]O DO EQUIPAMENTO\\b',
  '\\bSEGURAN[CÇ]A DO PACIENTE\\b',
  '\\bHORAS DE TRABALHO\\b',
  '\\bDADOS DO EQUIPAMENTO\\b',
  '\\bDetalhes do (?:Cliente|Equipamento)\\b',
  // Headers de tabela formato antigo — exigem coluna seguinte
  '\\bHoras\\s+TIPO\\b',
  '\\bPe[cç]as\\s*\\n', '\\bDespesas\\s*\\n', '\\bFerramenta\\s*\\n',
  '\\bNro de S[eé]rie\\b',
  // Footer / paginação
  '\\bRelat[oó]rio de servi[cç]o\\b',
  '\\bCaso\\s+\\d{6,}\\s+Page\\b', // "Caso 16802404 Page 1 of 2" no rodape
  '\\bPage\\s+\\d+\\s+of\\s+\\d+\\b',
  '\\bAssinatura do (?:T[eé]cnico|Cliente)\\b',
  // Bloco WO numerado (WO-NNNNNNNN)
  '\\bWO[-\\s]?\\d{6,}\\b',
];

const NEXT_LABEL_LOOKAHEAD = `(?=\\s*(?:` +
  // Labels com dois pontos: exigem `:` ou similar logo apos
  LABELS_COM_DOIS_PONTOS.map((l) => `${l}\\s*:`).join('|') +
  '|' +
  // Section headers: ja tem \b inline
  SECTION_HEADERS.join('|') +
  `)|$)`;

function captureField(label, text) {
  // Permite acentos opcionais e pequenas variantes de encoding.
  const re = new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)${NEXT_LABEL_LOOKAHEAD}`, 'i');
  const m = text.match(re);
  if (!m) return null;
  const valor = m[1] || '';
  // Trunca defensivamente — se passou disso, eh sinal de regex runaway
  // (provavelmente PDF com formato nao previsto). Melhor cortar do que
  // entupir o LLM com lixo.
  return valor.length > TAMANHO_MAXIMO_CAMPO
    ? valor.slice(0, TAMANHO_MAXIMO_CAMPO)
    : valor;
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
  // Cada campo aceita label do formato NOVO ou do formato ANTIGO (pre-2025).
  // Os fallbacks cobrem reports legados que ainda existem no backlog.
  const problemReported  = trimMulti(
    captureField('Problema descrito pelo Cliente', text) ||
    captureField('Problema Relatado',              text)
  );
  const problemAnalyzed  = trimMulti(
    captureField('Problema analisado pelo engenheiro', text) ||
    captureField('Problema Identificado',              text)
  );
  const actionsTaken     = trimMulti(
    captureField('A[cç][oõ]es tomadas', text) ||
    captureField('A[cç][aã]o realizada', text)
  );
  const rootCauseRaw     = trim(
    captureField('Causa do problema', text) ||
    captureField('Causa do Problema', text)
  );
  const testsPerformed   = trimMulti(
    captureField('Testes realizados',                       text) ||
    captureField('Verifica[cç][aã]o\\s*\\/?\\s*Testes Realizados', text)
  );

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
