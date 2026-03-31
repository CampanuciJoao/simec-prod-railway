// Ficheiro: simec/backend-simec/services/alertasService.js
// VERSÃO 7.0 - INÍCIO REAL AUTOMÁTICO BASEADO NO AGENDAMENTO

import prisma from './prismaService.js';
import { enviarEmail } from './emailService.js';
import { addDays, isBefore, isAfter, differenceInDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ==========================================================================
// SEÇÃO DE MANUTENÇÕES
// (Lógica de alertas internos e automação de status)
// ==========================================================================

export async function atualizarStatusManutencoes() {
  const agora = new Date();

  // 1. Inicia manutenções 'Agendada' -> 'EmAndamento'
  const manutsParaIniciar = await prisma.manutencao.findMany({
    where: { status: 'Agendada', dataHoraAgendamentoInicio: { lte: agora } },
    // Buscamos também a data agendada para usá-la como início real
    select: { id: true, equipamentoId: true, numeroOS: true, dataHoraAgendamentoInicio: true },
  });

  if (manutsParaIniciar.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const manut of manutsParaIniciar) {
        // Atualiza o Equipamento para 'Em Manutenção'
        await tx.equipamento.update({ 
          where: { id: manut.equipamentoId }, 
          data: { status: 'EmManutencao' } 
        });

        // Atualiza a OS para 'Em Andamento' e COPIA a hora agendada para o Início Real
        await tx.manutencao.update({
          where: { id: manut.id },
          data: { 
            status: 'EmAndamento',
            dataInicioReal: manut.dataHoraAgendamentoInicio // <<< Automação solicitada
          }
        });
        
        // Gera o alerta interno de início
        await tx.alerta.create({
          data: {
            id: `manut-iniciada-${manut.id}`,
            titulo: `Manutenção Iniciada: OS ${manut.numeroOS}`,
            subtitulo: `A manutenção foi iniciada automaticamente.`,
            data: agora,
            prioridade: 'Media',
            tipo: 'Manutenção',
            link: `/manutencoes/detalhes/${manut.id}`
          }
        });
      }
    });
    console.log(`[STATUS AUTO] ${manutsParaIniciar.length} manutenção(ões) iniciada(s) com Início Real carimbado.`);
  }

  // 2. Move 'EmAndamento' -> 'AguardandoConfirmacao'
  const manutsParaConfirmar = await prisma.manutencao.findMany({
    where: { status: 'EmAndamento', dataHoraAgendamentoFim: { lte: agora } }
  });

  for (const manut of manutsParaConfirmar) {
    await prisma.$transaction(async (tx) => {
      await tx.manutencao.update({ where: { id: manut.id }, data: { status: 'AguardandoConfirmacao' } });
      await tx.alerta.upsert({
        where: { id: `manut-confirm-${manut.id}` },
        update: { titulo: 'Confirmação de Manutenção Pendente' },
        create: {
          id: `manut-confirm-${manut.id}`,
          titulo: 'Confirmação de Manutenção Pendente',
          subtitulo: `OS ${manut.numeroOS} finalizou. Confirme o status do equipamento.`,
          data: agora,
          prioridade: 'Alta',
          tipo: 'Manutenção',
          link: `/manutencoes/detalhes/${manut.id}`
        }
      });
    });
    console.log(`[STATUS AUTO] OS ${manut.numeroOS} movida para 'Aguardando Confirmação'.`);
  }
}

async function gerarAlertasDeProximidadeManutencao() {
  const agora = new Date();
  const PONTOS_INICIO = [
    { limiar: 10, prioridade: 'Alta', label: '10min', texto: 'em 10 minutos' },
    { limiar: 60, prioridade: 'Media', label: '1h', texto: 'em 1 hora' },
    { limiar: 60 * 24, prioridade: 'Baixa', label: '24h', texto: 'em 24 horas' },
    { limiar: 60 * 24 * 7, prioridade: 'Baixa', label: '7d', texto: 'em 7 dias' },
  ];
  const PONTOS_FIM = [
    { limiar: 10, prioridade: 'Alta', label: '10min', texto: 'em 10 minutos' },
    { limiar: 60, prioridade: 'Media', label: '1h', texto: 'em 1 hora' },
  ];

  const manutencoesProximas = await prisma.manutencao.findMany({
    where: {
      OR: [
        { status: 'Agendada', dataHoraAgendamentoInicio: { gt: agora } },
        { status: 'EmAndamento', dataHoraAgendamentoFim: { gt: agora } },
      ]
    },
    include: { equipamento: { select: { modelo: true, tag: true } } }
  });

  for (const manutencao of manutencoesProximas) {
    const tipoEvento = manutencao.status === 'Agendada' ? 'início' : 'fim';
    const dataAlvo = tipoEvento === 'início' ? manutencao.dataHoraAgendamentoInicio : manutencao.dataHoraAgendamentoFim;
    const pontosDeVerificacao = tipoEvento === 'início' ? PONTOS_INICIO : PONTOS_FIM;
    if (!dataAlvo) continue;
    const minutosRestantes = Math.round((dataAlvo.getTime() - agora.getTime()) / 60000);

    for (const ponto of pontosDeVerificacao) {
      if (minutosRestantes > 0 && minutosRestantes <= ponto.limiar) {
        const algumAlertaJaExiste = await prisma.alerta.findFirst({
            where: { id: { startsWith: `manut-prox-${tipoEvento}-${manutencao.id}-` } }
        });
        if (!algumAlertaJaExiste) {
          const idAlerta = `manut-prox-${tipoEvento}-${manutencao.id}-${ponto.label}`;
          await prisma.alerta.create({
            data: {
              id: idAlerta,
              titulo: `Manutenção ${tipoEvento === 'início' ? 'inicia' : 'termina'} ${ponto.texto}`,
              subtitulo: `OS ${manutencao.numeroOS} - Equip: ${manutencao.equipamento.modelo}`,
              data: dataAlvo,
              prioridade: ponto.prioridade,
              tipo: 'Manutenção',
              link: `/manutencoes/detalhes/${manutencao.id}`,
            },
          });
        }
        break; 
      }
    }
  }
}

// ==========================================================================
// SEÇÃO DE CONTRATOS E SEGUROS
// ==========================================================================

async function gerarAlertasVencimento(item, tipoEntidade) {
  const hoje = startOfDay(new Date());
  const dataDeVencimento = startOfDay(item.dataFim);
  if (isAfter(dataDeVencimento, hoje)) {
    const diasRestantes = differenceInDays(dataDeVencimento, hoje);
    const PONTOS = [
      { limiar: 30, prioridade: 'Baixa', label: '30d', texto: 'em 30 dias' },
      { limiar: 15, prioridade: 'Media', label: '15d', texto: 'em 15 dias' },
      { limiar: 7, prioridade: 'Alta', label: '7d', texto: 'em 7 dias' },
      { limiar: 1, prioridade: 'Alta', label: '1d', texto: 'amanhã' },
    ];
    for (const ponto of PONTOS) {
      if (diasRestantes > 0 && diasRestantes <= ponto.limiar) {
        const idAlerta = `${tipoEntidade.toLowerCase()}-vence-${item.id}-${ponto.label}`;
        if (!(await prisma.alerta.findUnique({ where: { id: idAlerta } }))) {
          await prisma.alerta.create({
            data: {
              id: idAlerta,
              titulo: `${tipoEntidade} vence ${ponto.texto}`,
              subtitulo: tipoEntidade === 'Contrato' ? `Nº ${item.numeroContrato}` : `Apólice Nº ${item.apoliceNumero}`,
              data: item.dataFim,
              prioridade: ponto.prioridade,
              tipo: tipoEntidade,
              link: `/${tipoEntidade.toLowerCase()}s`
            }
          });
        }
        break;
      }
    }
  } else {
    const idAlerta = `${tipoEntidade.toLowerCase()}-vencido-${item.id}`;
    if (!(await prisma.alerta.findUnique({ where: { id: idAlerta } }))) {
      await prisma.alerta.create({
        data: {
          id: idAlerta,
          titulo: `${tipoEntidade} Vencido`,
          subtitulo: tipoEntidade === 'Contrato' ? `Nº ${item.numeroContrato}` : `Apólice Nº ${item.apoliceNumero}`,
          data: item.dataFim,
          prioridade: 'Alta',
          tipo: tipoEntidade,
          link: `/${tipoEntidade.toLowerCase()}s`
        }
      });
    }
  }
}

async function verificarVencimentoContratos() {
  const contratosAtivos = await prisma.contrato.findMany({ where: { status: 'Ativo' } });
  const hoje = startOfDay(new Date());
  for (const contrato of contratosAtivos) {
    await gerarAlertasVencimento(contrato, 'Contrato');
    const emails = await prisma.emailNotificacao.findMany({ where: { ativo: true, recebeAlertasContrato: true } });
    for (const email of emails) {
      const dataInicioNotif = addDays(startOfDay(contrato.dataFim), -email.diasAntecedencia);
      if (isBefore(hoje, contrato.dataFim) && (hoje.getTime() >= dataInicioNotif.getTime())) {
        const jaEnviado = await prisma.notificacaoEnviada.findFirst({ where: { entidade: 'Contrato', entidadeId: contrato.id, emailNotificacaoId: email.id } });
        if (!jaEnviado) {
          const dias = differenceInDays(contrato.dataFim, hoje);
          await enviarEmail({
            para: email.email,
            assunto: `[SIMEC] Alerta: Contrato ${contrato.numeroContrato} vence em ${dias} dia(s)`,
            dadosTemplate: {
              nomeDestinatario: email.nome || 'Usuário',
              tituloAlerta: 'Vencimento de Contrato',
              mensagemPrincipal: `O contrato abaixo vencerá em breve.`,
              detalhes: { 'Nº Contrato': contrato.numeroContrato, 'Fornecedor': contrato.fornecedor, 'Vence em': format(contrato.dataFim, 'dd/MM/yyyy') },
              textoBotao: 'Ver Contrato', linkBotao: `${process.env.FRONTEND_URL}/contratos`
            }
          });
          await prisma.notificacaoEnviada.create({ data: { entidade: 'Contrato', entidadeId: contrato.id, emailNotificacaoId: email.id } });
        }
      }
    }
  }
}

async function verificarVencimentoSeguros() {
  const segurosAtivos = await prisma.seguro.findMany({ where: { status: 'Ativo' } });
  const hoje = startOfDay(new Date());
  for (const seguro of segurosAtivos) {
    await gerarAlertasVencimento(seguro, 'Seguro');
    const emails = await prisma.emailNotificacao.findMany({ where: { ativo: true, recebeAlertasSeguro: true } });
    for (const email of emails) {
      const dataInicioNotif = addDays(startOfDay(seguro.dataFim), -email.diasAntecedencia);
      if (isBefore(hoje, seguro.dataFim) && (hoje.getTime() >= dataInicioNotif.getTime())) {
        const jaEnviado = await prisma.notificacaoEnviada.findFirst({ where: { entidade: 'Seguro', entidadeId: seguro.id, emailNotificacaoId: email.id } });
        if (!jaEnviado) {
          const dias = differenceInDays(seguro.dataFim, hoje);
          await enviarEmail({
            para: email.email,
            assunto: `[SIMEC] Alerta: Apólice ${seguro.apoliceNumero} vence em ${dias} dia(s)`,
            dadosTemplate: {
              nomeDestinatario: email.nome || 'Usuário',
              tituloAlerta: 'Vencimento de Seguro',
              mensagemPrincipal: `A apólice abaixo vencerá em breve.`,
              detalhes: { 'Nº Apólice': seguro.apoliceNumero, 'Seguradora': seguro.seguradora, 'Vence em': format(seguro.dataFim, 'dd/MM/yyyy') },
              textoBotao: 'Ver Seguro', linkBotao: `${process.env.FRONTEND_URL}/seguros`
            }
          });
          await prisma.notificacaoEnviada.create({ data: { entidade: 'Seguro', entidadeId: seguro.id, emailNotificacaoId: email.id } });
        }
      }
    }
  }
}

export async function processarAlertasEEnviarNotificacoes() {
  try {
    await gerarAlertasDeProximidadeManutencao();
    await verificarVencimentoContratos();
    await verificarVencimentoSeguros();
  } catch (error) { console.error('[ERRO Alertas]:', error); }
}