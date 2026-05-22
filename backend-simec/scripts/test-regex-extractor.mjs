// Valida o fix da Camada 1 testando o regex de captureField nos dois
// formatos da GE — NOVO e ANTIGO. Replica a logica do extractor.

const LABELS_COM_DOIS_PONTOS = [
  'N[uú]mero do Caso', 'Tipo do Servi[cç]o', 'Data de abertura', 'Status do Equip(?:a)?mento',
  'Nome do Site', 'System ID', 'S[eé]rie', 'S[eé]rial', 'Modalidade', 'UDI',
  'Lot number', 'Sala\\/ ?Departamento', 'Engenheiro', 'Nome do Contato',
  'Endere[cç]o', 'Nome do Cliente',
  'Problema descrito pelo Cliente', 'Problema analisado pelo engenheiro',
  'A[cç][oõ]es tomadas', 'Causa do problema', 'Testes realizados',
  'Problema Relatado', 'Problema Identificado', 'A[cç][aã]o realizada',
  'Causa do Problema',
  'Verifica[cç][aã]o\\s*\\/?\\s*Testes Realizados',
  'Nome T[eé]cnico', 'Data\\/Hora',
];
const SECTION_HEADERS = [
  '\\bINFORMA[CÇ][AÃ]O DO EQUIPAMENTO\\b',
  '\\bSEGURAN[CÇ]A DO PACIENTE\\b',
  '\\bHORAS DE TRABALHO\\b',
  '\\bDADOS DO EQUIPAMENTO\\b',
  '\\bDetalhes do (?:Cliente|Equipamento)\\b',
  '\\bHoras\\s+TIPO\\b',
  '\\bPe[cç]as\\s*\\n', '\\bDespesas\\s*\\n', '\\bFerramenta\\s*\\n',
  '\\bNro de S[eé]rie\\b',
  '\\bRelat[oó]rio de servi[cç]o\\b',
  '\\bCaso\\s+\\d{6,}\\s+Page\\b',
  '\\bPage\\s+\\d+\\s+of\\s+\\d+\\b',
  '\\bAssinatura do (?:T[eé]cnico|Cliente)\\b',
  '\\bWO[-\\s]?\\d{6,}\\b',
];
const LOOKAHEAD = `(?=\\s*(?:` +
  LABELS_COM_DOIS_PONTOS.map((l) => `${l}\\s*:`).join('|') +
  '|' + SECTION_HEADERS.join('|') + `)|$)`;

function capture(label, text) {
  const re = new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)${LOOKAHEAD}`, 'i');
  const m = text.match(re);
  return m?.[1]?.trim() || null;
}

const novoFmt = [
  'Engenheiro: John Mauricio Puerto Castillo',
  'Problema descrito pelo Cliente: A mesa do equipamento esta fazendo muito barulho ao andar',
  'Problema analisado pelo engenheiro: Mesa fazendo ruido ao se deslocar',
  'Acoes tomadas: OLE contata Joao Campanuci. Identifica-se que a correia da mesa esta frouxa.',
  'Causa do problema: Correia da mesa desajustada',
  'Testes realizados: A informacao e validada com o cliente. Confirma-se a correia frouxa.',
  'HORAS DE TRABALHO',
].join('\n');

const antigoFmt = [
  'Problema Relatado: A mesa do equipamento esta fazendo muito barulho ao andar',
  'Problema Identificado: Mesa fazendo ruido ao se deslocar',
  'Acao realizada: Ajustada a correia da mesa.',
  'Causa do Problema: desgaste',
  'Verificacao / Testes Realizados: ok',
  'Horas TIPO TECNICO INICIO DATA /HORA',
  'Repair Pedro Carbonari 22 Jan. 2026 08:09',
  'Pecas',
  'No Parts',
  'Relatorio de servico',
  'Caso 16802404 Page 1 of 2',
].join('\n');

let passou = 0;
let falhou = 0;

function teste(nome, valorObtido, esperadoSubstring, maxLen = 400) {
  const valor = valorObtido || '';
  const ok = valor.toLowerCase().includes(esperadoSubstring.toLowerCase()) && valor.length < maxLen;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${nome} (${valor.length} chars): "${valor.slice(0, 80)}${valor.length > 80 ? '...' : ''}"`);
  if (ok) passou++; else falhou++;
}

console.log('=== FORMATO NOVO ===');
teste('Problema analisado', capture('Problema analisado pelo engenheiro', novoFmt), 'mesa fazendo ruido');
teste('Acoes tomadas',      capture('A[cç][oõ]es tomadas', novoFmt),                 'correia da mesa esta frouxa');
teste('Causa do problema',  capture('Causa do problema', novoFmt),                   'correia da mesa desajustada');
teste('Testes realizados',  capture('Testes realizados', novoFmt),                   'correia frouxa');

console.log('\n=== FORMATO ANTIGO (era o bugado) ===');
teste('Problema Identificado', capture('Problema Identificado', antigoFmt),       'mesa fazendo ruido');
teste('Acao realizada',        capture('A[cç][aã]o realizada', antigoFmt),        'ajustada a correia');
teste('Causa do Problema',     capture('Causa do Problema', antigoFmt),           'desgaste');
teste('Verificacao/Testes',    capture('Verifica[cç][aã]o\\s*\\/?\\s*Testes Realizados', antigoFmt), 'ok');

console.log(`\n${passou} passou, ${falhou} falhou`);
process.exit(falhou === 0 ? 0 : 1);
