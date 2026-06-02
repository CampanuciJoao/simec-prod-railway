// Matcher robusto de modalidades sujeitas a Controle de Qualidade.
//
// PROBLEMA QUE RESOLVE: o cadastro de Equipamento.tipo eh string livre
// e o usuario digita com variacoes (Mamografo vs Mamografia, com/sem
// acento, plurais, "DR (Radiografia Digital)" em vez de "Raio-X"). A
// comparacao `tipo IN [lista_exata]` perdia esses equipamentos.
//
// COMO FUNCIONA: cada modalidade regulada/recomendada eh declarada como
// um conjunto de PADROES substring (case-insensitive). Match positivo
// se o tipo do equipamento conter qualquer padrao do conjunto.
//
// REGULACAO (ANVISA RDC 611/2022 + IN 90/2021):
// - Mamografia (qualquer tipo)
// - Tomografia Computadorizada
// - Equipamentos de raios-X (DR, CR, movel, arco cirurgico, fluoroscopia)
// - Densitometria ossea
// - Medicina Nuclear (gama camara, PET-CT, SPECT)
//
// RECOMENDADAS (boa pratica de engenharia clinica, sem obrigacao legal):
// - Ressonancia Magnetica
// - Ultrassonografia

// CRITICO: cada padrao eh aplicado no Postgres via ILIKE (case-insensitive
// MAS accent-SENSITIVE). Por isso temos VARIANTES com e sem acento — sem
// elas, "Mamógrafo" nao bate "mamograf", "Ressonância" nao bate "ressonan".
// A funcao JS ehModalidadeCq() faz normalizacao manual de acento, mas a
// query Prisma usa os padroes diretos.
const MATCHERS = [
  // Reguladas RDC 611
  {
    padroes: ['mamograf', 'mamógraf'],
    categoriaCanonica: 'Mamografia',
    regulada: true,
  },
  {
    padroes: ['tomografia comput', 'tomógraf'],
    categoriaCanonica: 'Tomografia Computadorizada',
    regulada: true,
  },
  {
    padroes: [
      'raio-x',
      'raio x',
      'raiox',
      'radiografia digital',
      'radiografia computadorizada',
      'arco cirurgico',
      'arco cirúrgico',
      'fluoroscop',
    ],
    categoriaCanonica: 'Raio-X / Radiografia',
    regulada: true,
  },
  {
    padroes: ['densitomet', 'densitômet'],
    categoriaCanonica: 'Densitometria Óssea',
    regulada: true,
  },
  {
    padroes: ['pet-ct', 'pet ct', 'pet/ct', 'pet/tc'],
    categoriaCanonica: 'PET-CT',
    regulada: true,
  },
  {
    padroes: ['cintilog', 'cintilóg', 'gama camara', 'gama câmara', 'gama-camara', 'gama-câmara'],
    categoriaCanonica: 'Cintilografia',
    regulada: true,
  },
  {
    padroes: ['spect'],
    categoriaCanonica: 'SPECT',
    regulada: true,
  },
  {
    padroes: ['medicina nuclear'],
    categoriaCanonica: 'Medicina Nuclear',
    regulada: true,
  },
  // Recomendadas
  {
    padroes: ['ressonan', 'ressonân'],
    categoriaCanonica: 'Ressonância Magnética',
    regulada: false,
  },
  {
    padroes: ['ultrasson', 'ultrassom', 'ultrasom', 'ultra-som'],
    categoriaCanonica: 'Ultrassonografia',
    regulada: false,
  },
];

function normalizar(s) {
  if (!s) return '';
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Lista de TODOS os padroes (substring normalizada) — usada em
// buildPrismaWhere abaixo.
const TODOS_PADROES = MATCHERS.flatMap((m) => m.padroes);

export function ehModalidadeCq(tipo) {
  const n = normalizar(tipo);
  if (!n) return false;
  return TODOS_PADROES.some((p) => n.includes(normalizar(p)));
}

export function ehModalidadeCqRegulada(tipo) {
  const n = normalizar(tipo);
  if (!n) return false;
  return MATCHERS.filter((m) => m.regulada).some((m) =>
    m.padroes.some((p) => n.includes(normalizar(p)))
  );
}

// Retorna categoria canonica do equipamento (ou null se nenhuma bate).
// Util pra agrupar relatorios.
export function categoriaCanonicaCq(tipo) {
  const n = normalizar(tipo);
  if (!n) return null;
  for (const m of MATCHERS) {
    if (m.padroes.some((p) => n.includes(normalizar(p)))) {
      return m.categoriaCanonica;
    }
  }
  return null;
}

// Constroi clausula Prisma WHERE pra filtrar equipamentos das modalidades
// CQ usando contains (case-insensitive). Resultado: { OR: [{ tipo: { contains: ..., mode: 'insensitive' } }, ...] }.
//
// Importante: contains do Prisma + Postgres faz ILIKE %padrao%. Como
// nossos padroes ja estao em lower-case ASCII (sem acentos), funciona
// pra "Mamógrafo" porque o Postgres com mode:insensitive nao ignora
// acento por default. Por isso temos VARIACOES com acento na lista
// quando aplicavel ("arco cirurgico" + "arco cirúrgico").
export function buildWhereModalidadeCq() {
  return {
    OR: TODOS_PADROES.map((padrao) => ({
      tipo: { contains: padrao, mode: 'insensitive' },
    })),
  };
}

// Versao filtrada: so reguladas (uso futuro pra relatorios estritos
// de conformidade legal). Hoje nao usado, exposto pra uso por consumidor
// que queira diferenciar.
export function buildWhereModalidadeCqRegulada() {
  const padroesRegulados = MATCHERS.filter((m) => m.regulada).flatMap((m) => m.padroes);
  return {
    OR: padroesRegulados.map((padrao) => ({
      tipo: { contains: padrao, mode: 'insensitive' },
    })),
  };
}

// Exposto pra testes
export const _MATCHERS_TESTES = MATCHERS;
