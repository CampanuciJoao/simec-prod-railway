// Ficheiro: simec/backend-simec/services/alertasService.js
// VERSÃO 8.0 - LÓGICA DE VENCIMENTO CORRIGIDA (URGÊNCIA PRIORITÁRIA)

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
    select: { id: true, equipamentoId: true, numeroOS: true, dataHoraAgendamentoInicio: true },
  });

  if (manutsParaIniciar.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const manut of manutsParaIniciar) {
        await tx.equipamento.update({ where: { id: manut.equipamentoId }, data: { status: 'EmManutencao' } });
        
        await tx.manutencao.update({
          where: { id: manut.id },
          data: { 
            status: 'EmAndamento',
            dataInicioReal: manut.dataHoraAgendamentoInicio 
          }
        });
        
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
    console.log(`[STATUS AUTO] ${manutsParaIniciar.length} manutenção(ões) iniciada(s).`);
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
  }
}

async function gerarAlertasDeProximidadeManutencao() {
  const agora = new Date();
  const PONTOS_INICIO = [
    { limiar: 10, prioridade: 'Alta', label: '10min', texto: 'em 10 minutos' },
    { limiar: 60, prioridade: 'Media', label: '1h', texto: 'em 1 hora' },
    { limiar: 1440, prioridade: 'Baixa', label: '24h', texto: 'em 24 horas' },
  ];

  const manutencoesProximas = await prisma.manutencao.findMany({
    where: { status: 'Agendada', dataHoraAgendamentoInicio: { gt: agora } },
    include: { equipamento: { select: { modelo: true } } }
  });

  for (const manut of manutencoesProximas) {
    const minRestantes = Math.round((manut.dataHoraAgendamentoInicio.getTime() - agora.getTime()) / 60000);
    for (const ponto of PONTOS_INICIO) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const idAlerta = `manut-prox-início-${manut.id}-${ponto.label}`;
        const jaExiste = await prisma.alerta.findUnique({ where: { id: idAlerta } });
        if (!jaExiste) {
          await prisma.alerta.create({
            data: {
              id: idAlerta,
              titulo: `Manutenção inicia ${ponto.texto}`,
              subtitulo: `OS ${manut.numeroOS} - ${manut.equipamento.modelo}`,
              data: manut.dataHoraAgendamentoInicio,
              prioridade: ponto.prioridade,
              tipo: 'Manutenção',
              link: `/manutencoes/detalhes/${manut.id}`
            }
          });
        }
        break;
      }
    }
  }
}

// ==========================================================================
// SEÇÃO DE CONTRATOS E SEGUROS (Lógica de Vencimento Corrigida)
// ==========================================================================

async function gerarAlertasVencimento(item, tipoEntidade) {
  const hoje = startOfDay(new Date());
  const dataDeVencimento = startOfDay(item.dataFim);

  if (isAfter(dataDeVencimento, hoje)) {
    const diasRestantes = differenceInDays(dataDeVencimento, hoje);
    
    // >>> CORREÇÃO AQUI: Ordem do menor para o maior limiar <<<
    const PONTOS = [
      { limiar: 1, prioridade: 'Alta', label: '1d', texto: 'amanhã' },
      { limiar: 7, prioridade: 'Alta', label: '7d', texto: 'em 7 dias' },
      { limiar: 15, prioridade: 'Media', label: '15d', texto: 'em 15 dias' },
      { limiar: 30, prioridade: 'Baixa', label: '30d', texto: 'em 30 dias' },
    ];

    for (const ponto of PONTOS) {
      if (diasRestantes > 0 && diasRestantes <= ponto.limiar) {
        const idAlerta = `${tipoEntidade.toLowerCase()}-vence-${item.id}-${ponto.label}`;
        const jaExiste = await prisma.alerta.findUnique({ where: { id: idAlerta } });
        
        if (!jaExiste) {
          await prisma.alerta.create({
            data: {
              id: idAlerta,
              titulo: `${tipoEntidade} vence ${ponto.texto}`, // Agora usa o texto correto (ex: amanhã)
              subtitulo: tipoEntidade === 'Contrato' ? `Nº ${item.numeroContrato}` : `Apólice Nº ${item.apoliceNumero}`,
              data: item.dataFim,
              prioridade: ponto.prioridade,
              tipo: tipoEntidade,
              link: `/${tipoEntidade.toLowerCase()}s`
            }
          });
          console.log(`[ALERTA VENCIMENTO] Alerta '${ponto.label}' gerado para ${tipoEntidade} ${item.id}.`);
        }
        // Ao encontrar o ponto mais urgente, para de procurar os outros
        break; 
      }
    }
  } else {
    // Lógica para itens já vencidos
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
        const jaEnviado = await prisma.notificacaoEnviada.findFirst({
          where: { entidade: 'Contrato', entidadeId: contrato.id, emailNotificacaoId: email.id },
        });

        if (!jaEnviado) {
          const dias = differenceInDays(contrato.dataFim, hoje);
          await enviarEmail({
            para: email.email,
            assunto: `[SIMEC] Alerta: Contrato ${contrato.numeroContrato} vence em ${dias} dia(s)`,
            dadosTemplate: {
              nomeDestinatario: email.nome || 'Usuário',
              tituloAlerta: 'Vencimento de Contrato',
              mensagemPrincipal: `O contrato abaixo vencerá em breve.`,
              detalhes: { 
                'Nº Contrato': contrato.numeroContrato, 
                'Fornecedor': contrato.fornecedor, 
                'Vence em': format(contrato.dataFim, 'dd/MM/yyyy', { locale: ptBR }) 
              },
              textoBotao: 'Ver Contrato', 
              linkBotao: `${process.env.FRONTEND_URL}/contratos`
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
        const jaEnviado = await prisma.notificacaoEnviada.findFirst({
          where: { entidade: 'Seguro', entidadeId: seguro.id, emailNotificacaoId: email.id },
        });

        if (!jaEnviado) {
          const dias = differenceInDays(seguro.dataFim, hoje);
          await enviarEmail({
            para: email.email,
            assunto: `[SIMEC] Alerta: Seguro ${seguro.apoliceNumero} vence em ${dias} dia(s)`,
            dadosTemplate: {
              nomeDestinatario: email.nome || 'Usuário',
              tituloAlerta: 'Vencimento de Seguro',
              mensagemPrincipal: `A apólice abaixo vencerá em breve.`,
              detalhes: { 
                'Nº Apólice': seguro.apoliceNumero, 
                'Seguradora': seguro.seguradora, 
                'Vence em': format(seguro.dataFim, 'dd/MM/yyyy', { locale: ptBR }) 
              },
              textoBotao: 'Ver Seguro', 
              linkBotao: `${process.env.FRONTEND_URL}/seguros`
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
  } catch (error) {
    console.error('[ERRO GERAL Alertas]:', error);
  }
}