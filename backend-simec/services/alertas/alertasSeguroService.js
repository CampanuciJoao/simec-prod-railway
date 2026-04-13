import prisma from '../prismaService.js';
import { addDays, differenceInDays, isAfter, startOfDay } from 'date-fns';
import { getAgora } from '../timeService.js';

async function gerarAlertaVencimentoSeguro(seguro, hoje) {
  const dataDeVencimento = startOfDay(new Date(seguro.dataFim));

  if (!isAfter(dataDeVencimento, hoje)) {
    await prisma.alerta.upsert({
      where: { id: `seguro-vencido-${seguro.id}` },
      update: {
        titulo: 'Seguro vencido',
      },
      create: {
        id: `seguro-vencido-${seguro.id}`,
        titulo: 'Seguro vencido',
        subtitulo: `Apólice Nº ${seguro.apoliceNumero}`,
        data: seguro.dataFim,
        prioridade: 'Alta',
        tipo: 'Seguro',
        link: '/seguros',
      },
    });

    return 1;
  }

  const diasRestantes = differenceInDays(dataDeVencimento, hoje);

  const PONTOS = [
    { limiar: 1, prioridade: 'Alta', label: '1d', texto: 'amanhã' },
    { limiar: 7, prioridade: 'Alta', label: '7d', texto: 'em 7 dias' },
    { limiar: 15, prioridade: 'Media', label: '15d', texto: 'em 15 dias' },
    { limiar: 30, prioridade: 'Baixa', label: '30d', texto: 'em 30 dias' },
  ];

  for (const ponto of PONTOS) {
    if (diasRestantes > 0 && diasRestantes <= ponto.limiar) {
      await prisma.alerta.upsert({
        where: { id: `seguro-vence-${seguro.id}-${ponto.label}` },
        update: {
          titulo: `Seguro vence ${ponto.texto}`,
        },
        create: {
          id: `seguro-vence-${seguro.id}-${ponto.label}`,
          titulo: `Seguro vence ${ponto.texto}`,
          subtitulo: `Apólice Nº ${seguro.apoliceNumero}`,
          data: seguro.dataFim,
          prioridade: ponto.prioridade,
          tipo: 'Seguro',
          link: '/seguros',
        },
      });

      return 1;
    }
  }

  return 0;
}

export async function gerarAlertasSeguro() {
  const hoje = startOfDay(getAgora());

  const segurosAtivos = await prisma.seguro.findMany({
    where: {
      status: { in: ['Ativo', 'Vigente'] },
    },
  });

  let total = 0;

  for (const seguro of segurosAtivos) {
    total += await gerarAlertaVencimentoSeguro(seguro, hoje);
  }

  return total;
}