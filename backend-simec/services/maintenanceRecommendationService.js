import prisma from './prismaService.js';
import { subDays } from 'date-fns';

function calcularHorasParadas(manutencoes = []) {
  let totalMs = 0;

  for (const manut of manutencoes) {
    const inicio = manut.dataInicioReal || manut.dataHoraAgendamentoInicio || null;
    const fim = manut.dataFimReal || manut.dataConclusao || manut.dataHoraAgendamentoFim || null;

    if (inicio && fim) {
      const diff = new Date(fim).getTime() - new Date(inicio).getTime();
      if (diff > 0) totalMs += diff;
    }
  }

  return Number((totalMs / (1000 * 60 * 60)).toFixed(1));
}

function montarAnalise({
  totalCorretivas,
  horasParadas,
  totalOcorrencias,
  ocorrenciasNaoResolvidas
}) {
  let score = 0;

  score += totalCorretivas * 3;
  score += totalOcorrencias * 1.5;
  score += ocorrenciasNaoResolvidas * 2.5;

  if (horasParadas >= 8) score += 2;
  if (horasParadas >= 16) score += 3;
  if (horasParadas >= 24) score += 4;

  let prioridade = null;
  let recomendacao = null;
  let motivo = null;

  if (
    totalCorretivas >= 5 ||
    horasParadas >= 24 ||
    (totalOcorrencias >= 6 && ocorrenciasNaoResolvidas >= 2) ||
    score >= 18
  ) {
    prioridade = 'Alta';
    recomendacao = 'Recomenda-se preventiva extraordinária e avaliação preditiva do ativo.';
    motivo = 'criticidade elevada por reincidência de falhas e/ou indisponibilidade acumulada';
  } else if (
    totalCorretivas >= 3 ||
    horasParadas >= 12 ||
    totalOcorrencias >= 4 ||
    ocorrenciasNaoResolvidas >= 2 ||
    score >= 10
  ) {
    prioridade = 'Media';
    recomendacao = 'Recomenda-se revisão preventiva antecipada e inspeção técnica detalhada.';
    motivo = 'sinais recorrentes de degradação operacional';
  } else if (
    totalCorretivas >= 2 ||
    totalOcorrencias >= 3 ||
    ocorrenciasNaoResolvidas >= 1 ||
    score >= 6
  ) {
    prioridade = 'Baixa';
    recomendacao = 'Recomenda-se acompanhamento mais próximo e revisão do histórico recente.';
    motivo = 'indícios iniciais de recorrência';
  }

  if (!prioridade) return null;

  return {
    prioridade,
    score: Number(score.toFixed(1)),
    recomendacao,
    motivo
  };
}

function montarSubtitulo({
  totalCorretivas,
  horasParadas,
  totalOcorrencias,
  ocorrenciasNaoResolvidas,
  analise
}) {
  return (
    `${totalCorretivas} corretiva(s), ` +
    `${horasParadas}h de indisponibilidade, ` +
    `${totalOcorrencias} ocorrência(s), ` +
    `${ocorrenciasNaoResolvidas} não resolvida(s) nos últimos 90 dias. ` +
    `Motivo: ${analise.motivo}. ` +
    `${analise.recomendacao}`
  );
}

export async function gerarRecomendacoesProativasDeManutencao() {
  const dataCorte = subDays(new Date(), 90);

  const equipamentos = await prisma.equipamento.findMany({
    include: {
      unidade: true,
      manutencoes: {
        where: {
          createdAt: { gte: dataCorte }
        },
        select: {
          id: true,
          numeroOS: true,
          tipo: true,
          status: true,
          dataHoraAgendamentoInicio: true,
          dataHoraAgendamentoFim: true,
          dataInicioReal: true,
          dataFimReal: true,
          dataConclusao: true,
          createdAt: true
        }
      },
      ocorrencias: {
        where: {
          data: { gte: dataCorte }
        },
        select: {
          id: true,
          data: true,
          titulo: true,
          tipo: true,
          resolvido: true
        }
      }
    }
  });

  let totalProcessados = 0;

  for (const equipamento of equipamentos) {
    const corretivas = equipamento.manutencoes.filter((m) => m.tipo === 'Corretiva');
    const totalCorretivas = corretivas.length;
    const horasParadas = calcularHorasParadas(corretivas);
    const totalOcorrencias = equipamento.ocorrencias.length;
    const ocorrenciasNaoResolvidas = equipamento.ocorrencias.filter((o) => !o.resolvido).length;

    const analise = montarAnalise({
      totalCorretivas,
      horasParadas,
      totalOcorrencias,
      ocorrenciasNaoResolvidas
    });

    if (!analise) continue;

    const unidadeNome = equipamento.unidade?.nomeSistema || 'N/A';
    const modelo = equipamento.modelo || 'Equipamento';
    const tag = equipamento.tag || 'Sem TAG';

    const idAlerta = `recomendacao-manut-${equipamento.id}-${dataCorte.toISOString().slice(0, 10)}`;
    const titulo = `Recomendação preventiva para ${modelo} (${tag})`;
    const subtitulo = montarSubtitulo({
      totalCorretivas,
      horasParadas,
      totalOcorrencias,
      ocorrenciasNaoResolvidas,
      analise
    });

    await prisma.alerta.upsert({
      where: { id: idAlerta },
      update: {
        titulo,
        subtitulo,
        data: new Date(),
        prioridade: analise.prioridade,
        tipo: 'Manutenção',
        link: `/equipamentos/detalhes/${equipamento.id}`
      },
      create: {
        id: idAlerta,
        titulo,
        subtitulo,
        data: new Date(),
        prioridade: analise.prioridade,
        tipo: 'Manutenção',
        link: `/equipamentos/detalhes/${equipamento.id}`
      }
    });

    totalProcessados += 1;

    console.log(
      `[RECOMENDACAO_MANUTENCAO] ${unidadeNome} | ${modelo} (${tag}) | corretivas=${totalCorretivas} | horas=${horasParadas} | ocorrencias=${totalOcorrencias} | abertas=${ocorrenciasNaoResolvidas} | prioridade=${analise.prioridade} | score=${analise.score}`
    );
  }

  return totalProcessados;
}