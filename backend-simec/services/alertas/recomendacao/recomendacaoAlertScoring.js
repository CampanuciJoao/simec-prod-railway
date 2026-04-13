export function normalizarTexto(texto = '') {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function obterPesoTipoEquipamento(tipo = '', modelo = '') {
  const texto = `${tipo} ${modelo}`;
  const t = normalizarTexto(texto);

  if (
    t.includes('tomografia') ||
    t.includes('ct') ||
    t.includes('tc') ||
    t.includes('aquilion') ||
    t.includes('act revolution') ||
    t.includes('pet-ct')
  ) {
    return 1.5;
  }

  if (t.includes('ressonancia') || t.includes('rnm') || t.includes('rm')) {
    return 1.45;
  }

  if (t.includes('mamografia') || t.includes('mamografo')) {
    return 1.3;
  }

  if (
    t.includes('raio x') ||
    t.includes('raio-x') ||
    t.includes('rx') ||
    t.includes('dr') ||
    t.includes('cr')
  ) {
    return 1.25;
  }

  if (
    t.includes('ultrassom') ||
    t.includes('ultrasonografia') ||
    t.includes('ultra') ||
    t.includes('us')
  ) {
    return 1.15;
  }

  return 1;
}

export function obterPesoCriticidadeUnidade(unidadeNome = '') {
  const nome = normalizarTexto(unidadeNome);

  if (!nome) return 1;

  if (
    nome.includes('sede') ||
    nome.includes('hospital regional') ||
    nome.includes('referencia')
  ) {
    return 1.3;
  }

  if (
    nome.includes('coxim') ||
    nome.includes('dourados') ||
    nome.includes('campo grande')
  ) {
    return 1.15;
  }

  return 1;
}

export function extrairChaveReincidenciaOcorrencia(ocorrencia) {
  const base = `${ocorrencia?.tipo || ''} ${ocorrencia?.titulo || ''} ${ocorrencia?.descricao || ''}`;
  const texto = normalizarTexto(base);

  if (!texto) return 'sem-chave';

  if (texto.includes('bobina')) return 'bobina';
  if (texto.includes('tubo')) return 'tubo';
  if (texto.includes('gerador')) return 'gerador';
  if (texto.includes('detector')) return 'detector';
  if (texto.includes('software')) return 'software';
  if (texto.includes('rede')) return 'rede';
  if (texto.includes('energia')) return 'energia';
  if (texto.includes('refrigeracao')) return 'refrigeracao';
  if (texto.includes('calibr')) return 'calibracao';
  if (texto.includes('imagem')) return 'imagem';
  if (texto.includes('placa')) return 'placa';
  if (texto.includes('fonte')) return 'fonte';

  return texto.slice(0, 60);
}

export function calcularReincidencia(ocorrencias = []) {
  const mapa = new Map();

  for (const ocorrencia of ocorrencias) {
    const chave = extrairChaveReincidenciaOcorrencia(ocorrencia);
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  }

  let maiorGrupo = 0;

  for (const total of mapa.values()) {
    if (total > maiorGrupo) {
      maiorGrupo = total;
    }
  }

  return {
    grupos: mapa.size,
    maiorGrupo,
  };
}

export function calcularScoreRisco({
  equipamento,
  unidadeNome,
  ocorrencias = [],
  manutencoes = [],
}) {
  const corretivas = manutencoes.filter((m) => m.tipo === 'Corretiva');
  const preventivas = manutencoes.filter((m) => m.tipo === 'Preventiva');
  const calibracoes = manutencoes.filter((m) => m.tipo === 'Calibracao');
  const inspecoes = manutencoes.filter((m) => m.tipo === 'Inspecao');

  const { maiorGrupo } = calcularReincidencia(ocorrencias);

  let scoreBase = 0;

  scoreBase += ocorrencias.length * 2.2;
  scoreBase += corretivas.length * 4.5;
  scoreBase += preventivas.length * 0.8;
  scoreBase += calibracoes.length * 1.2;
  scoreBase += inspecoes.length * 1.0;

  if (maiorGrupo >= 2) scoreBase += maiorGrupo * 2.5;

  if (equipamento?.status === 'Inoperante') scoreBase += 8;
  if (equipamento?.status === 'EmManutencao') scoreBase += 4;
  if (equipamento?.status === 'UsoLimitado') scoreBase += 3;

  const pesoTipo = obterPesoTipoEquipamento(
    equipamento?.tipo,
    equipamento?.modelo
  );

  const pesoUnidade = obterPesoCriticidadeUnidade(unidadeNome);

  const scoreFinal = Math.round(scoreBase * pesoTipo * pesoUnidade);

  return {
    scoreBase,
    scoreFinal,
    ocorrencias: ocorrencias.length,
    corretivas: corretivas.length,
    preventivas: preventivas.length,
    calibracoes: calibracoes.length,
    inspecoes: inspecoes.length,
    maiorReincidencia: maiorGrupo,
    pesoTipo,
    pesoUnidade,
  };
}

export function definirPrioridade(scoreFinal) {
  if (scoreFinal >= 22) return 'Alta';
  if (scoreFinal >= 12) return 'Media';
  return 'Baixa';
}

export function deveRecomendar({ metricas }) {
  return (
    metricas.scoreFinal >= 12 ||
    metricas.corretivas >= 2 ||
    metricas.ocorrencias >= 3 ||
    metricas.maiorReincidencia >= 2
  );
}