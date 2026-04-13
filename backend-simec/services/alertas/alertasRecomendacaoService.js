import prisma from '../prismaService.js';
import { addDays, differenceInDays } from 'date-fns';
import { getAgora } from '../timeService.js';

const JANELA_DIAS = 90;

function normalizarTexto(texto = '') {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function obterPesoTipoEquipamento(tipo = '', modelo = '') {
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

  if (
    t.includes('ressonancia') ||
    t.includes('rnm') ||
    t.includes('rm')
  ) {
    return 1.45;
  }

  if (
    t.includes('mamografia') ||
    t.includes('mamografo')
  ) {
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

function obterPesoCriticidadeUnidade(unidadeNome = '') {
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

function extrairChaveReincidenciaOcorrencia(ocorrencia) {
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
  if (texto.includes('refrigeracao') || texto.includes('refrigeração')) return 'refrigeracao';
  if (texto.includes('calibr')) return 'calibracao';
  if (texto.includes('imagem')) return 'imagem';
  if (texto.includes('placa')) return 'placa';
  if (texto.includes('fonte')) return 'fonte';

  return texto.slice(0, 60);
}

function calcularReincidencia(ocorrencias = []) {
  const mapa = new Map();

  for (const ocorrencia of ocorrencias) {
    const chave = extrairChaveReincidenciaOcorrencia(ocorrencia);
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  }

  let maiorGrupo = 0;

  for (const total of mapa.values()) {
    if (total > maiorGrupo) maiorGrupo = total;
  }

  return {
    grupos: mapa.size,
    maiorGrupo,
  };
}

function calcularScoreRisco({
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

function definirPrioridade(scoreFinal) {
  if (scoreFinal >= 22) return 'Alta';
  if (scoreFinal >= 12) return 'Media';
  return 'Baixa';
}

function deveRecomendar({ metricas }) {
  return (
    metricas.scoreFinal >= 12 ||
    metricas.corretivas >= 2 ||
    metricas.ocorrencias >= 3 ||
    metricas.maiorReincidencia >= 2
  );
}

function montarTituloRecomendacao(unidadeNome) {
  return `Recomendação de preventiva para equipamento da unidade de ${unidadeNome}`;
}

function montarSubtituloRecomendacao({
  equipamento,
  unidadeNome,
  metricas,
}) {
  const partes = [];

  partes.push(
    `${equipamento.modelo} (${equipamento.tag || 'Sem TAG'})`
  );

  partes.push(
    `score ${metricas.scoreFinal}`
  );

  if (metricas.ocorrencias > 0) {
    partes.push(`${metricas.ocorrencias} ocorrência(s)`);
  }

  if (metricas.corretivas > 0) {
    partes.push(`${metricas.corretivas} corretiva(s)`);
  }

  if (metricas.maiorReincidencia >= 2) {
    partes.push(`reincidência ${metricas.maiorReincidencia}x`);
  }

  partes.push(`últimos ${JANELA_DIAS} dias`);

  return `${partes.join(' | ')} | unidade ${unidadeNome}`;
}

function montarResumoAnalitico({
  equipamento,
  unidadeNome,
  metricas,
}) {
  const fatores = [];

  if (metricas.ocorrencias > 0) {
    fatores.push(`${metricas.ocorrencias} ocorrência(s) recente(s)`);
  }

  if (metricas.corretivas > 0) {
    fatores.push(`${metricas.corretivas} manutenção(ões) corretiva(s)`);
  }

  if (metricas.maiorReincidencia >= 2) {
    fatores.push(`reincidência técnica detectada (${metricas.maiorReincidencia} registros parecidos)`);
  }

  if (equipamento?.status === 'Inoperante') {
    fatores.push('equipamento atualmente inoperante');
  } else if (equipamento?.status === 'EmManutencao') {
    fatores.push('equipamento já em manutenção');
  } else if (equipamento?.status === 'UsoLimitado') {
    fatores.push('equipamento com uso limitado');
  }

  const motivo =
    fatores.length > 0
      ? fatores.join(', ')
      : 'histórico recente acima do padrão esperado';

  return `Recomenda-se avaliar preventiva/preditiva para ${equipamento.modelo} (${equipamento.tag || 'Sem TAG'}) na unidade de ${unidadeNome}, pois o ativo apresentou ${motivo} nos últimos ${JANELA_DIAS} dias.`;
}

async function existeAlerta(id) {
  const alerta = await prisma.alerta.findUnique({
    where: { id },
    select: { id: true },
  });

  return !!alerta;
}

export async function gerarAlertasRecomendacao() {
  const agora = getAgora();
  const dataCorte = addDays(agora, -JANELA_DIAS);

  const equipamentos = await prisma.equipamento.findMany({
    include: {
      unidade: true,
      ocorrencias: {
        where: {
          data: {
            gte: dataCorte,
          },
        },
        orderBy: {
          data: 'desc',
        },
      },
      manutencoes: {
        where: {
          OR: [
            {
              dataHoraAgendamentoInicio: {
                gte: dataCorte,
              },
            },
            {
              dataConclusao: {
                gte: dataCorte,
              },
            },
          ],
        },
        orderBy: {
          dataHoraAgendamentoInicio: 'desc',
        },
      },
    },
  });

  let total = 0;

  for (const equipamento of equipamentos) {
    const unidadeNome = equipamento.unidade?.nomeSistema || 'N/A';
    const ocorrenciasRecentes = equipamento.ocorrencias || [];
    const manutencoesRecentes = equipamento.manutencoes || [];

    const metricas = calcularScoreRisco({
      equipamento,
      unidadeNome,
      ocorrencias: ocorrenciasRecentes,
      manutencoes: manutencoesRecentes,
    });

    if (!deveRecomendar({ metricas })) {
      continue;
    }

    const alertaId = `recomendacao-preventiva-${equipamento.id}-${agora.getFullYear()}-${agora.getMonth() + 1}`;

    const jaExiste = await existeAlerta(alertaId);
    if (jaExiste) continue;

    const titulo = montarTituloRecomendacao(unidadeNome);
    const subtitulo = montarSubtituloRecomendacao({
      equipamento,
      unidadeNome,
      metricas,
    });

    const descricaoAnalitica = montarResumoAnalitico({
      equipamento,
      unidadeNome,
      metricas,
    });

    await prisma.alerta.create({
      data: {
        id: alertaId,
        titulo,
        subtitulo: `${subtitulo}. ${descricaoAnalitica}`,
        data: agora,
        prioridade: definirPrioridade(metricas.scoreFinal),
        tipo: 'Recomendação',
        link: `/equipamentos/ficha-tecnica/${equipamento.id}`,
      },
    });

    total += 1;

    console.log(
      `[ALERTA_RECOMENDACAO] Criado para ${equipamento.modelo} (${equipamento.id}) | score=${metricas.scoreFinal} | unidade=${unidadeNome}`
    );
  }

  return total;
}