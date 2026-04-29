import { normalizarTexto } from '../../shared/textUtils.js';

function parseMetadata(evento) {
  if (!evento) return null;

  if (evento.metadata && typeof evento.metadata === 'object') {
    return evento.metadata;
  }

  if (typeof evento.metadataJson === 'string' && evento.metadataJson.trim()) {
    try {
      return JSON.parse(evento.metadataJson);
    } catch {
      return null;
    }
  }

  return null;
}

function toDateOrNull(valor) {
  if (!valor) return null;
  const parsed = new Date(valor);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function obterDataEvento(evento) {
  return (
    toDateOrNull(evento?.dataEvento) ||
    toDateOrNull(evento?.createdAt) ||
    null
  );
}

function ehManutencaoResolvidaComSucesso(evento) {
  if (
    evento?.categoria !== 'manutencao' ||
    evento?.tipoEvento !== 'manutencao_concluir' ||
    !['Corretiva', 'Preventiva'].includes(evento?.subcategoria)
  ) {
    return false;
  }

  const metadata = parseMetadata(evento);

  return (
    metadata?.manutencaoRealizada === true &&
    metadata?.equipamentoOperante === true
  );
}

function contemPalavra(textoNormalizado, termo) {
  return textoNormalizado.includes(termo);
}

function contemAlgum(textoNormalizado, termos = []) {
  return termos.some((termo) => contemPalavra(textoNormalizado, termo));
}

export function obterPesoTipoEquipamento(tipo = '', modelo = '') {
  const texto = normalizarTexto(`${tipo} ${modelo}`);

  if (
    contemAlgum(texto, [
      'tomografia',
      'aquilion',
      'act revolution',
      'pet-ct',
      'pet ct',
    ]) ||
    /\bct\b/.test(texto) ||
    /\btc\b/.test(texto)
  ) {
    return 1.5;
  }

  if (
    contemAlgum(texto, ['ressonancia', 'rnm']) ||
    /\brm\b/.test(texto)
  ) {
    return 1.45;
  }

  if (contemAlgum(texto, ['mamografia', 'mamografo'])) {
    return 1.3;
  }

  if (
    contemAlgum(texto, ['raio x', 'raio-x']) ||
    /\brx\b/.test(texto) ||
    /\bdr\b/.test(texto) ||
    /\bcr\b/.test(texto)
  ) {
    return 1.25;
  }

  if (
    contemAlgum(texto, ['ultrassom', 'ultrasonografia']) ||
    /\bus\b/.test(texto)
  ) {
    return 1.15;
  }

  return 1;
}

export function obterPesoCriticidadeUnidade(unidadeNome = '') {
  const nome = normalizarTexto(unidadeNome);

  if (!nome) return 1;

  if (
    contemAlgum(nome, [
      'sede',
      'hospital regional',
      'referencia',
    ])
  ) {
    return 1.3;
  }

  if (
    contemAlgum(nome, [
      'coxim',
      'dourados',
      'campo grande',
    ])
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
  historicoEventos = [],
}) {
  const eventosAnaliticos = Array.isArray(historicoEventos)
    ? historicoEventos
    : [];

  const usarHistoricoAnalitico = eventosAnaliticos.length > 0;

  const resolucoesManutencao = usarHistoricoAnalitico
    ? eventosAnaliticos.filter(ehManutencaoResolvidaComSucesso)
    : [];

  const ultimaResolucaoManutencao = resolucoesManutencao
    .map(obterDataEvento)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  const filtrarAposUltimaResolucao = (eventos = [], getData) => {
    if (!ultimaResolucaoManutencao) return eventos;

    return eventos.filter((item) => {
      const data = getData(item);
      return data && data.getTime() > ultimaResolucaoManutencao.getTime();
    });
  };

  const ocorrenciasBaseOriginal = usarHistoricoAnalitico
    ? eventosAnaliticos.filter(
        (evento) =>
          evento.categoria === 'ocorrencia' &&
          evento.tipoEvento === 'ocorrencia_registrada'
      )
    : ocorrencias;

  const corretivasOriginais = usarHistoricoAnalitico
    ? eventosAnaliticos.filter(
        (evento) =>
          evento.categoria === 'manutencao' &&
          evento.tipoEvento === 'manutencao_registrada' &&
          evento.subcategoria === 'Corretiva'
      )
    : manutencoes.filter((m) => m.tipo === 'Corretiva');

  const ocorrenciasBase = filtrarAposUltimaResolucao(
    ocorrenciasBaseOriginal,
    (evento) => obterDataEvento(evento) || toDateOrNull(evento?.data)
  );

  const corretivas = filtrarAposUltimaResolucao(
    corretivasOriginais,
    (evento) =>
      obterDataEvento(evento) ||
      toDateOrNull(evento?.dataConclusao) ||
      toDateOrNull(evento?.dataHoraAgendamentoInicio) ||
      toDateOrNull(evento?.createdAt)
  );

  const preventivas = usarHistoricoAnalitico
    ? []
    : manutencoes.filter((m) => m.tipo === 'Preventiva');

  const calibracoes = usarHistoricoAnalitico
    ? []
    : manutencoes.filter((m) => m.tipo === 'Calibracao');

  const inspecoes = usarHistoricoAnalitico
    ? []
    : manutencoes.filter((m) => m.tipo === 'Inspecao');

  const { maiorGrupo, grupos } = calcularReincidencia(ocorrenciasBase);

  let scoreBase = 0;

  scoreBase += ocorrenciasBase.length * 2.2;
  scoreBase += corretivas.length * 4.5;
  scoreBase += calibracoes.length * 1.2;
  scoreBase += inspecoes.length * 1.0;

  if (maiorGrupo >= 2) {
    scoreBase += maiorGrupo * 2.5;
  }

  if (equipamento?.status === 'Inoperante') scoreBase += 8;
  if (equipamento?.status === 'EmManutencao') scoreBase += 4;
  if (equipamento?.status === 'UsoLimitado') scoreBase += 3;

  const pesoTipo = obterPesoTipoEquipamento(
    equipamento?.tipo,
    equipamento?.modelo
  );

  const pesoUnidade = obterPesoCriticidadeUnidade(unidadeNome);

  const scoreFinal = Math.max(
    0,
    Math.round(scoreBase * pesoTipo * pesoUnidade)
  );

  return {
    scoreBase,
    scoreFinal,
    ocorrencias: ocorrenciasBase.length,
    corretivas: corretivas.length,
    preventivas: preventivas.length,
    calibracoes: calibracoes.length,
    inspecoes: inspecoes.length,
    gruposReincidencia: grupos,
    maiorReincidencia: maiorGrupo,
    manutencoesResolvidasComSucesso: resolucoesManutencao.length,
    ultimaResolucaoManutencao:
      ultimaResolucaoManutencao?.toISOString?.() || null,
    pesoTipo,
    pesoUnidade,
  };
}

export function definirPrioridade(scoreFinal) {
  if (scoreFinal >= 22) return 'Alta';
  if (scoreFinal >= 12) return 'Media';
  return 'Baixa';
}

export function definirNivelRisco(scoreFinal) {
  if (scoreFinal >= 35) return 'Critico';
  if (scoreFinal >= 22) return 'Alto';
  if (scoreFinal >= 12) return 'Moderado';
  return 'Baixo';
}

export function deveRecomendar({ metricas }) {
  return (
    metricas.scoreFinal >= 12 ||
    metricas.corretivas >= 2 ||
    metricas.ocorrencias >= 3 ||
    metricas.maiorReincidencia >= 2
  );
}
