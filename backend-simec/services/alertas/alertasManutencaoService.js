import prisma from '../prismaService.js';
import { format } from 'date-fns';
import { getAgora } from '../timeService.js';

function formatarIntervaloHorario(dataInicio, dataFim) {
  const horaInicio = dataInicio ? format(new Date(dataInicio), 'HH:mm') : '--:--';
  const horaFim = dataFim ? format(new Date(dataFim), 'HH:mm') : '--:--';
  return `${horaInicio} - ${horaFim}`;
}

function montarTituloInicio(manut) {
  const tipo = String(manut.tipo || 'Manutenção').toLowerCase();
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)} na unidade de ${unidade}`;
}

function montarSubtituloInicio(manut) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';
  const intervalo = formatarIntervaloHorario(
    manut.dataHoraAgendamentoInicio,
    manut.dataHoraAgendamentoFim
  );

  return `${modelo} (${tag}) | ${intervalo} | OS ${manut.numeroOS}`;
}

function montarTituloFim(manut) {
  const tipo = String(manut.tipo || 'Manutenção').toLowerCase();
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `Término de ${tipo} na unidade de ${unidade}`;
}

function montarSubtituloFim(manut) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';
  const intervalo = formatarIntervaloHorario(
    manut.dataHoraAgendamentoInicio,
    manut.dataHoraAgendamentoFim
  );

  return `${modelo} (${tag}) | ${intervalo} | OS ${manut.numeroOS}`;
}

function montarTituloConfirmacao(manut) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `Confirmar conclusão: ${modelo} (${tag}) na unidade de ${unidade}`;
}

function montarSubtituloConfirmacao(manut) {
  const intervalo = formatarIntervaloHorario(
    manut.dataHoraAgendamentoInicio,
    manut.dataHoraAgendamentoFim
  );

  return `OS ${manut.numeroOS} | ${intervalo} | O prazo expirou. Confirme se a manutenção foi concluída ou prorrogada.`;
}

async function existeAlerta(id) {
  const alerta = await prisma.alerta.findUnique({
    where: { id },
    select: { id: true },
  });

  return !!alerta;
}

async function criarAlertaSeNaoExistir(payload) {
  const jaExiste = await existeAlerta(payload.id);
  if (jaExiste) return false;

  await prisma.alerta.create({ data: payload });
  return true;
}

async function gerarAlertasAproximacaoInicio(agora) {
  const PONTOS_INICIO = [
    { limiar: 10, prioridade: 'Alta', label: '10min' },
    { limiar: 60, prioridade: 'Media', label: '1h' },
    { limiar: 1440, prioridade: 'Baixa', label: '24h' },
  ];

  const manutencoes = await prisma.manutencao.findMany({
    where: {
      status: 'Agendada',
      dataHoraAgendamentoInicio: { gt: agora },
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoInicio: 'asc',
    },
  });

  let total = 0;

  for (const manut of manutencoes) {
    const minRestantes = Math.floor(
      (new Date(manut.dataHoraAgendamentoInicio).getTime() - agora.getTime()) / 60000
    );

    console.log(
      `[ALERTA_MANUT_INICIO] OS ${manut.numeroOS} | faltam=${minRestantes} min`
    );

    for (const ponto of PONTOS_INICIO) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const criado = await criarAlertaSeNaoExistir({
          id: `manut-prox-inicio-${manut.id}-${ponto.label}`,
          titulo: montarTituloInicio(manut),
          subtitulo: montarSubtituloInicio(manut),
          data: manut.dataHoraAgendamentoInicio,
          prioridade: ponto.prioridade,
          tipo: 'Manutenção',
          link: `/manutencoes/detalhes/${manut.id}`,
        });

        if (criado) {
          total += 1;
          console.log(
            `[ALERTA_MANUT_INICIO] Criado ${ponto.label} para OS ${manut.numeroOS}`
          );
        }

        break;
      }
    }
  }

  return total;
}

async function iniciarManutencoesAutomaticamente(agora) {
  const margemInicio = new Date(agora.getTime() + 60000);

  const manutsParaIniciar = await prisma.manutencao.findMany({
    where: {
      status: 'Agendada',
      dataHoraAgendamentoInicio: { lte: margemInicio },
      dataHoraAgendamentoFim: {
        not: null,
        gt: agora,
      },
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
  });

  let total = 0;

  for (const manut of manutsParaIniciar) {
    await prisma.$transaction(async (tx) => {
      await tx.equipamento.update({
        where: { id: manut.equipamentoId },
        data: { status: 'EmManutencao' },
      });

      await tx.manutencao.update({
        where: { id: manut.id },
        data: {
          status: 'EmAndamento',
          dataInicioReal: manut.dataInicioReal || manut.dataHoraAgendamentoInicio,
        },
      });

      const modelo = manut.equipamento?.modelo || 'Equipamento';
      const tag = manut.equipamento?.tag || 'Sem TAG';
      const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';

      await tx.alerta.upsert({
        where: { id: `manut-iniciada-${manut.id}` },
        update: {
          titulo: `Manutenção iniciada na unidade de ${unidade}, no equipamento ${modelo} (${tag})`,
          subtitulo: `OS ${manut.numeroOS} - Iniciada automaticamente.`,
          data: agora,
          prioridade: 'Media',
          tipo: 'Manutenção',
          link: `/manutencoes/detalhes/${manut.id}`,
        },
        create: {
          id: `manut-iniciada-${manut.id}`,
          titulo: `Manutenção iniciada na unidade de ${unidade}, no equipamento ${modelo} (${tag})`,
          subtitulo: `OS ${manut.numeroOS} - Iniciada automaticamente.`,
          data: agora,
          prioridade: 'Media',
          tipo: 'Manutenção',
          link: `/manutencoes/detalhes/${manut.id}`,
        },
      });
    });

    total += 1;
    console.log(`[ALERTA_MANUT_INICIO_AUTO] OS ${manut.numeroOS} iniciada automaticamente`);
  }

  return total;
}

async function gerarAlertasAproximacaoFim(agora) {
  const PONTOS_FIM = [
    { limiar: 10, prioridade: 'Alta', label: '10min' },
    { limiar: 30, prioridade: 'Media', label: '30min' },
  ];

  const manutencoes = await prisma.manutencao.findMany({
    where: {
      status: { in: ['Agendada', 'EmAndamento'] },
      dataHoraAgendamentoFim: {
        not: null,
        gt: agora,
      },
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoFim: 'asc',
    },
  });

  let total = 0;

  for (const manut of manutencoes) {
    const minRestantes = Math.floor(
      (new Date(manut.dataHoraAgendamentoFim).getTime() - agora.getTime()) / 60000
    );

    console.log(
      `[ALERTA_MANUT_FIM] OS ${manut.numeroOS} | status=${manut.status} | faltam=${minRestantes} min`
    );

    for (const ponto of PONTOS_FIM) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const criado = await criarAlertaSeNaoExistir({
          id: `manut-prox-fim-${manut.id}-${ponto.label}`,
          titulo: montarTituloFim(manut),
          subtitulo: montarSubtituloFim(manut),
          data: manut.dataHoraAgendamentoFim,
          prioridade: ponto.prioridade,
          tipo: 'Manutenção',
          link: `/manutencoes/detalhes/${manut.id}`,
        });

        if (criado) {
          total += 1;
          console.log(
            `[ALERTA_MANUT_FIM] Criado ${ponto.label} para OS ${manut.numeroOS}`
          );
        }

        break;
      }
    }
  }

  return total;
}

async function moverParaAguardandoConfirmacao(agora) {
  const manutencoes = await prisma.manutencao.findMany({
    where: {
      status: { in: ['Agendada', 'EmAndamento'] },
      dataHoraAgendamentoFim: {
        not: null,
        lte: agora,
      },
    },
    include: {
      equipamento: {
        include: {
          unidade: true,
        },
      },
    },
    orderBy: {
      dataHoraAgendamentoFim: 'asc',
    },
  });

  let total = 0;

  for (const manut of manutencoes) {
    await prisma.$transaction(async (tx) => {
      await tx.manutencao.update({
        where: { id: manut.id },
        data: {
          status: 'AguardandoConfirmacao',
        },
      });

      await tx.equipamento.update({
        where: { id: manut.equipamentoId },
        data: {
          status: 'EmManutencao',
        },
      });

      await tx.alerta.upsert({
        where: { id: `manut-confirm-${manut.id}` },
        update: {
          titulo: montarTituloConfirmacao(manut),
          subtitulo: montarSubtituloConfirmacao(manut),
          data: agora,
          prioridade: 'Alta',
          tipo: 'Manutenção',
          link: `/manutencoes/detalhes/${manut.id}`,
        },
        create: {
          id: `manut-confirm-${manut.id}`,
          titulo: montarTituloConfirmacao(manut),
          subtitulo: montarSubtituloConfirmacao(manut),
          data: agora,
          prioridade: 'Alta',
          tipo: 'Manutenção',
          link: `/manutencoes/detalhes/${manut.id}`,
        },
      });
    });

    total += 1;
    console.log(
      `[ALERTA_MANUT_CONFIRMACAO] OS ${manut.numeroOS} movida para AguardandoConfirmacao`
    );
  }

  return total;
}

export async function gerarAlertasManutencao() {
  const agora = getAgora();

  console.log(
    `[ALERTAS_MANUTENCAO] Iniciando ciclo às ${agora.toLocaleString('pt-BR')}`
  );

  const totalInicioProx = await gerarAlertasAproximacaoInicio(agora);
  const totalIniciadas = await iniciarManutencoesAutomaticamente(agora);
  const totalFimProx = await gerarAlertasAproximacaoFim(agora);
  const totalConfirmacao = await moverParaAguardandoConfirmacao(agora);

  const total = totalInicioProx + totalIniciadas + totalFimProx + totalConfirmacao;

  console.log(
    `[ALERTAS_MANUTENCAO] Concluído | proxInicio=${totalInicioProx} | iniciadas=${totalIniciadas} | proxFim=${totalFimProx} | aguardandoConfirmacao=${totalConfirmacao}`
  );

  return total;
}