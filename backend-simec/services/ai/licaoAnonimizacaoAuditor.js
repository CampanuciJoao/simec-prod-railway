// Auditor adversarial de licoes despersonalizadas (cross-tenant).
//
// Roda DEPOIS do `despersonalizar()` em categoriaFeedbackService. Procura
// padroes que escaparam da primeira passada — nomes proprios sem titulo,
// numeros curtos isolados, siglas de cliente, etc. Quando flagra, a
// licao eh criada com status='QUARENTENA' + ativa=false em vez de entrar
// direto em few-shot.
//
// Filosofia: nunca bloquear criacao da licao (preserva historico), mas
// vetar uso em few-shot ate revisao manual. Falsa-positiva eh ok —
// melhor o admin clicar "Aprovar" 10 vezes que ter um dado pessoal
// alimentando o prompt de outro cliente.
//
// Lista de termos tecnicos WHITELIST eh fundamental — sem ela, palavras
// validas tipo "Helio", "Gradient", "Compressor" disparariam falso
// positivo de "palavra capitalizada isolada".

const TERMOS_TECNICOS_WHITELIST = new Set([
  // Tipos de equipamento medico
  'tc', 'rm', 'usg', 'mamografo', 'mamografia', 'dr', 'ct', 'mri', 'mr',
  'pet', 'spect', 'us', 'rx', 'raiox', 'raio-x',
  // Componentes de imagem
  'gradient', 'gradiente', 'helio', 'helium', 'magneto', 'bobina', 'coil',
  'rf', 'sequencia', 'shim', 'shimming', 'cryo', 'criogenia', 'compressor',
  'magnet', 'detector', 'colimador', 'tubo', 'tube', 'gantry', 'console',
  'workstation', 'cooling',
  // Falhas/sintomas comuns
  'quench', 'leak', 'leakage', 'artefato', 'artefatos', 'ruido', 'noise',
  'overload', 'overheating', 'erro', 'falha', 'fail', 'reset', 'reboot',
  'shutdown', 'crash', 'travamento',
  // Acoes/servicos
  'preventiva', 'corretiva', 'calibracao', 'calibration', 'inspecao',
  'inspection', 'troca', 'reparo', 'limpeza', 'check', 'teste',
  'substituicao', 'substituição', 'reposicao', 'reposição',
  'realizacao', 'realização', 'verificacao', 'verificação',
  // Estrutura de laudo (cabecalhos comuns)
  'causa', 'acoes', 'acao', 'ações', 'ação', 'problema', 'solucao', 'solução',
  'observacao', 'observação', 'recomendacao', 'recomendação',
  'equipamento', 'sistema', 'componente', 'defeito', 'sintoma',
  'status', 'resultado', 'conclusao', 'conclusão', 'analise', 'análise',
  'reparo', 'manutencao', 'manutenção',
  // Unidades / siglas tecnicas
  'ge', 'kv', 'kva', 'mva', 'kw', 'mw', 'psi', 'bar', 'pa', 'hz', 'mhz',
  'fps', 'ip', 'tcp', 'udp', 'lan', 'wan', 'pacs', 'his', 'ris', 'dicom',
  'hl7', 'ehr', 'rdc', 'rdo', 'qc', 'cq', 'pm', 'cm', 'mm',
  // Status / placeholders apos scrubbing
  'id', 'serial', 'data', 'email', 'telefone', 'cnpj', 'cpf', 'nome',
  // Termos de OS
  'os', 'wo', 'sr', 'case', 'caso', 'chamado', 'ticket',
]);

// Lista de PRENOMES brasileiros frequentes — quando uma palavra capitalizada
// esta nessa lista, eh quase certo que eh nome proprio (mesmo no inicio
// de frase). Combinada com a heuristica de "palavra capitalizada sem
// titulo" reforca deteccao.
const PRENOMES_BR_COMUNS = new Set([
  'joao', 'maria', 'jose', 'antonio', 'francisco', 'carlos', 'paulo',
  'pedro', 'lucas', 'luiz', 'luis', 'marcos', 'rafael', 'daniel', 'marcelo',
  'bruno', 'eduardo', 'felipe', 'fernando', 'gabriel', 'gustavo',
  'ana', 'maria', 'francisca', 'antonia', 'adriana', 'juliana', 'marcia',
  'fernanda', 'patricia', 'aline', 'sandra', 'camila', 'amanda', 'bruna',
  'jessica', 'leticia', 'julia', 'luciana', 'vanessa',
  // Sobrenomes comuns BR
  'silva', 'santos', 'oliveira', 'souza', 'lima', 'pereira', 'ferreira',
  'rodrigues', 'gomes', 'martins', 'alves', 'costa', 'ribeiro', 'almeida',
  'carvalho', 'araujo', 'melo', 'barbosa', 'rocha', 'dias', 'campos',
  'cardoso', 'fonseca', 'reis', 'monteiro', 'mendes', 'castro', 'vieira',
]);

// Numeros curtos (4-5 digitos isolados) sao suspeitos quando rodeados
// de texto. Em "Eq. 1234 apresentou..." o 1234 vira lixo identificador.
const RE_NUMERO_CURTO_ISOLADO = /(?<![\d.\-])(\d{4,5})(?![\d.\-])/g;

// Sigla isolada (3-6 letras maiusculas seguidas) — potencial codigo
// de cliente ou unidade. Ex: "CRDL Sede", "HCSP", "INCA".
const RE_SIGLA_MAIUSCULA = /(?<![A-Z])([A-Z]{3,6})(?![A-Z])/g;

// Palavra capitalizada isolada que NAO eh termo tecnico nem placeholder.
// Pega "Joao reportou", "Maria validou", "Silva confirmou".
// Captura: palavra com inicial maiuscula + minusculas, comprimento 3-20.
const RE_PALAVRA_CAPITALIZADA = /(?<![A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,19})(?![A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])/g;

// Titulos que indicam que o scrubbing do nome PROPRIO falhou.
// Ex: "Eng" sozinho sem nome (porque o nome foi removido) eh ok;
// mas "Dr." seguido de nome ainda eh suspeito.
const RE_TITULO_SEGUIDO_DE_PALAVRA = /\b(Sr|Sra|Dr|Dra|Eng|T[eé]c|Biomed)\.?\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)/;

// Numero de telefone parcial (escapa do scrub principal)
const RE_TELEFONE_PARCIAL = /\b\d{4,5}[-\s]\d{4}\b/g;

function ehTermoTecnico(palavra) {
  return TERMOS_TECNICOS_WHITELIST.has(palavra.toLowerCase());
}

function ehPrenomeOuSobrenomeBR(palavra) {
  return PRENOMES_BR_COMUNS.has(palavra.toLowerCase());
}

// Verifica se palavra capitalizada pode ser inicio de frase OU rotulo
// estrutural ("Causa raw:", "Acoes:", "Problema |"). Delimitadores:
// inicio do texto, .!?, :, |.
function ehInicioDeFraseOuRotulo(texto, posicao) {
  if (posicao === 0) return true;
  let i = posicao - 1;
  while (i >= 0 && /\s/.test(texto[i])) i -= 1;
  if (i < 0) return true;
  return /[.!?:|]/.test(texto[i]);
}

/**
 * Analisa o texto despersonalizado em busca de padroes suspeitos.
 * Retorna { suspeita, padroes, trecho } onde:
 *  - suspeita: boolean
 *  - padroes: array de strings descrevendo o que foi encontrado
 *  - trecho: texto problematico truncado pra revisao manual
 */
export function detectarPadroesSuspeitos(textoDespersonalizado) {
  if (!textoDespersonalizado || typeof textoDespersonalizado !== 'string') {
    return { suspeita: false, padroes: [], trecho: null };
  }

  const padroes = [];
  const trechos = [];

  // 1. Numeros curtos isolados (4-5 digitos)
  const matchesNum = [...textoDespersonalizado.matchAll(RE_NUMERO_CURTO_ISOLADO)];
  if (matchesNum.length > 0) {
    padroes.push('numero_curto_isolado');
    trechos.push(matchesNum[0][0]);
  }

  // 2. Siglas em maiusculas (3-6 letras)
  const matchesSigla = [...textoDespersonalizado.matchAll(RE_SIGLA_MAIUSCULA)];
  const siglasSuspeitas = matchesSigla
    .map((m) => m[1])
    .filter((s) => !ehTermoTecnico(s));
  if (siglasSuspeitas.length > 0) {
    padroes.push('sigla_maiuscula');
    trechos.push(siglasSuspeitas[0]);
  }

  // 3. Palavras capitalizadas isoladas que nao sao termos tecnicos.
  //    Duas vias de deteccao (OR):
  //      a) palavra eh prenome/sobrenome brasileiro conhecido (mesmo no
  //         inicio de frase — nomes proprios sao nomes proprios)
  //      b) palavra capitalizada que nao esta em inicio de frase/rotulo
  //         E nao eh termo tecnico — sinal fraco mas captura nomes
  //         desconhecidos
  const matchesPalavra = [...textoDespersonalizado.matchAll(RE_PALAVRA_CAPITALIZADA)];
  const palavrasSuspeitas = matchesPalavra.filter((m) => {
    const palavra = m[1];
    if (ehPrenomeOuSobrenomeBR(palavra)) return true; // (a) — sempre suspeito
    if (ehTermoTecnico(palavra)) return false;
    if (ehInicioDeFraseOuRotulo(textoDespersonalizado, m.index)) return false;
    return true; // (b) — capitalizada, nao tecnica, no meio de frase
  });
  if (palavrasSuspeitas.length > 0) {
    padroes.push('palavra_capitalizada_sem_titulo');
    trechos.push(palavrasSuspeitas[0][1]);
  }

  // 4. Titulo seguido de palavra capitalizada — scrub do nome falhou
  const matchTitulo = textoDespersonalizado.match(RE_TITULO_SEGUIDO_DE_PALAVRA);
  if (matchTitulo) {
    padroes.push('titulo_com_nome');
    trechos.push(matchTitulo[0]);
  }

  // 5. Telefone parcial
  if (RE_TELEFONE_PARCIAL.test(textoDespersonalizado)) {
    padroes.push('telefone_parcial');
  }

  const suspeita = padroes.length > 0;
  // Trecho: mostra ate 200 chars centrados no primeiro problema
  let trecho = null;
  if (suspeita && trechos.length > 0) {
    const idx = textoDespersonalizado.indexOf(trechos[0]);
    if (idx >= 0) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(textoDespersonalizado.length, idx + 120);
      trecho = textoDespersonalizado.slice(start, end);
      if (start > 0) trecho = '...' + trecho;
      if (end < textoDespersonalizado.length) trecho = trecho + '...';
    } else {
      trecho = textoDespersonalizado.slice(0, 200);
    }
  }

  return { suspeita, padroes, trecho };
}

// Whitelist exposta pra testes
export const _WHITELIST_TESTES = TERMOS_TECNICOS_WHITELIST;
