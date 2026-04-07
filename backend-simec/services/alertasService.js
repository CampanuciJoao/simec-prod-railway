// Ficheiro: simec/backend-simec/services/alertasService.js

import prisma from './prismaService.js';
import { enviarEmail } from './emailService.js';
import { addDays, isBefore, isAfter, differenceInDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Função auxiliar para garantir o horário local do servidor (que já está em Campo Grande)
const getAgora = () => new Date();

// ==========================================================================
// SEÇÃO DE MANUTENÇÕES E SAÚDE PREDITIVA
// ==========================================================================

export async function atualizarStatusManutencoes() {
  const agora = getAgora();
  console.log(`[MANUTENÇÃO] Verificando trocas de status às: ${agora.toLocaleString('pt-BR')}`);

  // --- 1. FINALIZAÇÃO AUTOMÁTICA (OS que venceram e precisam de confirmação) ---
  const manutsParaConfirmar = await prisma.manutencao.findMany({
    where: { 
      status: { in: ['Agendada', 'EmAndamento'] }, 
      dataHoraAgendamentoFim: { lte: agora } 
    },
    include: { equipamento: { include: { unidade: true } } }
  });

  if (manutsParaConfirmar.length > 0) {
    console.log(`[MANUTENÇÃO] Movendo ${manutsParaConfirmar.length} manutenções para Aguardando Confirmação.`);
    for (const manut of manutsParaConfirmar) {
      await prisma.$transaction(async (tx) => {
        await tx.manutencao.update({ where: { id: manut.id }, data: { status: 'AguardandoConfirmacao' } });
        await tx.equipamento.update({ where: { id: manut.equipamentoId }, data: { status: 'EmManutencao' } });

        const modelo = manut.equipamento.modelo;
        const tag = manut.equipamento.tag;
        const unidade = manut.equipamento.unidade?.nomeSistema || "N/A";
        const novoTitulo = `Confirmar conclusão: ${modelo} (${tag}) em ${unidade}`;

        await tx.alerta.upsert({
          where: { id: `manut-confirm-${manut.id}` },
          update: { titulo: novoTitulo }, // ATUALIZA O TÍTULO SE JÁ EXISTIR
          create: {
            id: `manut-confirm-${manut.id}`,
            titulo: novoTitulo,
            subtitulo: `O prazo da OS ${manut.numeroOS} expirou. Por favor, confirme se o equipamento já está operante.`,
            data: agora,
            prioridade: 'Alta',
            tipo: 'Manutenção',
            link: `/manutencoes/detalhes/${manut.id}`
          }
        });
      });
    }
  }

  // --- 2. INÍCIO AUTOMÁTICO ---
  const manutsParaIniciar = await prisma.manutencao.findMany({
    where: { 
        status: 'Agendada', 
        dataHoraAgendamentoInicio: { lte: agora },
        dataHoraAgendamentoFim: { gt: agora } 
    },
    include: { equipamento: { include: { unidade: true } } }
  });

  if (manutsParaIniciar.length > 0) {
    console.log(`[MANUTENÇÃO] Iniciando ${manutsParaIniciar.length} manutenções.`);
    await prisma.$transaction(async (tx) => {
      for (const manut of manutsParaIniciar) {
        await tx.equipamento.update({ where: { id: manut.equipamentoId }, data: { status: 'EmManutencao' } });
        await tx.manutencao.update({ where: { id: manut.id }, data: { status: 'EmAndamento', dataInicioReal: manut.dataHoraAgendamentoInicio } });
        
        const modelo = manut.equipamento.modelo;
        const tag = manut.equipamento.tag;
        const unidade = manut.equipamento.unidade?.nomeSistema || "N/A";
        const novoTitulo = `Manutenção iniciada na unidade de ${unidade}, no equipamento ${modelo} (${tag})`;

        await tx.alerta.upsert({
          where: { id: `manut-iniciada-${manut.id}` },
          update: { titulo: novoTitulo }, // ATUALIZA O TÍTULO SE JÁ EXISTIR
          create: {
            id: `manut-iniciada-${manut.id}`,
            titulo: novoTitulo,
            subtitulo: `Ordem de Serviço ${manut.numeroOS} foi movida para "Em Andamento" automaticamente.`,
            data: agora,
            prioridade: 'Media',
            tipo: 'Manutenção',
            link: `/manutencoes/detalhes/${manut.id}`
          }
        });
      }
    });
  }
}

async function gerarAlertasDeProximidadeManutencao() {
  const agora = getAgora();
  const PONTOS_INICIO = [
    { limiar: 10, prioridade: 'Alta', label: '10min', texto: 'em 10 minutos' },
    { limiar: 60, prioridade: 'Media', label: '1h', texto: 'em 1 hora' },
    { limiar: 1440, prioridade: 'Baixa', label: '24h', texto: 'em 24 horas' },
  ];

  const manutencoesProximas = await prisma.manutencao.findMany({
    where: { status: 'Agendada', dataHoraAgendamentoInicio: { gt: agora } },
    include: { equipamento: { include: { unidade: true } } }
  });

  for (const manut of manutencoesProximas) {
    const minRestantes = Math.round((manut.dataHoraAgendamentoInicio.getTime() - agora.getTime()) / 60000);
    for (const ponto of PONTOS_INICIO) {
      if (minRestantes > 0 && minRestantes <= ponto.limiar) {
        const idAlerta = `manut-prox-início-${manut.id}-${ponto.label}`;
        
        const modelo = manut.equipamento.modelo;
        const tag = manut.equipamento.tag;
        const unidade = manut.equipamento.unidade?.nomeSistema || "N/A";
        const novoTitulo = `Manutenção começa ${ponto.texto} na unidade de ${unidade}, no equipamento ${modelo} (${tag})`;

        await prisma.alerta.upsert({
          where: { id: idAlerta },
          update: { titulo: novoTitulo }, // ATUALIZA O TÍTULO SE JÁ EXISTIR
          create: {
            id: idAlerta,
            titulo: novoTitulo,
            subtitulo: `A OS ${manut.numeroOS} está agendada para iniciar em breve.`,
            data: manut.dataHoraAgendamentoInicio,
            prioridade: ponto.prioridade,
            tipo: 'Manutenção',
            link: `/manutencoes/detalhes/${manut.id}`
          }
        });
        break;
      }
    }
  }
}

export async function processarSaudeEquipamentos() {
  const umAnoAtras = addDays(getAgora(), -365);
  const equipamentos = await prisma.equipamento.findMany({
    include: { ocorrencias: { where: { data: { gte: umAnoAtras } } } }
  });

  for (const eq of equipamentos) {
    const score = eq.ocorrencias.reduce((acc, occ) => acc + (occ.resolvido ? (occ.tipo === 'Infraestrutura' ? 3 : 1) : 0), 0);
    if (score >= 10) {
      const idAlerta = `alerta-saude-${eq.id}-${getAgora().getMonth()}`;
      const novoTitulo = `Risco de Falha Crítico: ${eq.modelo} (${eq.tag})`;

      await prisma.alerta.upsert({
        where: { id: idAlerta },
        update: { titulo: novoTitulo }, // ATUALIZA O TÍTULO SE JÁ EXISTIR
        create: {
          id: idAlerta,
          titulo: novoTitulo,
          subtitulo: `Este ativo atingiu um nível elevado de reincidência de problemas técnicos no último ano.`,
          data: getAgora(),
          prioridade: 'Alta',
          tipo: 'Manutenção',
          link: `/equipamentos/ficha-tecnica/${eq.id}`
        }
      });
    }
  }
}

// ==========================================================================
// SEÇÃO DE VENCIMENTOS (CONTRATOS E SEGUROS)
// ==========================================================================

async function gerarAlertasVencimento(item, tipoEntidade) {
  const hoje = startOfDay(getAgora());
  const dataDeVencimento = startOfDay(new Date(item.dataFim));

  if (isAfter(dataDeVencimento, hoje)) {
    const diasRestantes = differenceInDays(dataDeVencimento, hoje);
    const PONTOS = [
      { limiar: 1, prioridade: 'Alta', label: '1d', texto: 'amanhã' },
      { limiar: 7, prioridade: 'Alta', label: '7d', texto: 'em 7 dias' },
      { limiar: 15, prioridade: 'Media', label: '15d', texto: 'em 15 dias' },
      { limiar: 30, prioridade: 'Baixa', label: '30d', texto: 'em 30 dias' },
    ];

    for (const ponto of PONTOS) {
      if (diasRestantes > 0 && diasRestantes <= ponto.limiar) {
        const idAlerta = `${tipoEntidade.toLowerCase()}-vence-${item.id}-${ponto.label}`;
        const novoTitulo = `${tipoEntidade} vence ${ponto.texto}`;

        await prisma.alerta.upsert({
          where: { id: idAlerta },
          update: { titulo: novoTitulo },
          create: {
            id: idAlerta,
            titulo: novoTitulo,
            subtitulo: tipoEntidade === 'Contrato' ? `Nº ${item.numeroContrato}` : `Apólice Nº ${item.apoliceNumero}`,
            data: item.dataFim,
            prioridade: ponto.prioridade,
            tipo: tipoEntidade,
            link: `/${tipoEntidade.toLowerCase()}s`
          }
        });
        break; 
      }
    }
  } else {
    const idAlerta = `${tipoEntidade.toLowerCase()}-vencido-${item.id}`;
    const novoTitulo = `${tipoEntidade} Vencido`;

    await prisma.alerta.upsert({
      where: { id: idAlerta },
      update: { titulo: novoTitulo },
      create: {
        id: idAlerta,
        titulo: novoTitulo,
        subtitulo: tipoEntidade === 'Contrato' ? `Nº ${item.numeroContrato}` : `Apólice Nº ${item.apoliceNumero}`,
        data: item.dataFim,
        prioridade: 'Alta',
        tipo: tipoEntidade,
        link: `/${tipoEntidade.toLowerCase()}s`
      }
    });
  }
}

async function verificarVencimentoContratos() {
  const contratosAtivos = await prisma.contrato.findMany({ where: { status: 'Ativo' } });
  const hoje = startOfDay(getAgora());

  for (const contrato of contratosAtivos) {
    await gerarAlertasVencimento(contrato, 'Contrato');
    const emails = await prisma.emailNotificacao.findMany({ where: { ativo: true, recebeAlertasContrato: true } });
    for (const email of emails) {
      const dataInicioNotif = addDays(startOfDay(new Date(contrato.dataFim)), -email.diasAntecedencia);
      if (isBefore(hoje, new Date(contrato.dataFim)) && (hoje.getTime() >= dataInicioNotif.getTime())) {
        const jaEnviado = await prisma.notificacaoEnviada.findFirst({ where: { entidade: 'Contrato', entidadeId: contrato.id, emailNotificacaoId: email.id } });
        if (!jaEnviado) {
          const dias = differenceInDays(new Date(contrato.dataFim), hoje);
          await enviarEmail({
            para: email.email,
            assunto: `[SIMEC] Alerta: Contrato ${contrato.numeroContrato} vence em ${dias} dia(s)`,
            dadosTemplate: {
              nomeDestinatario: email.nome || 'Usuário', tituloAlerta: 'Vencimento de Contrato', mensagemPrincipal: `O contrato abaixo vencerá em breve.`,
              detalhes: { 'Nº Contrato': contrato.numeroContrato, 'Fornecedor': contrato.fornecedor, 'Vence em': format(new Date(contrato.dataFim), 'dd/MM/yyyy', { locale: ptBR }) },
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
  const hoje = startOfDay(getAgora());

  for (const seguro of segurosAtivos) {
    await gerarAlertasVencimento(seguro, 'Seguro');
    const emails = await prisma.emailNotificacao.findMany({ where: { ativo: true, recebeAlertasSeguro: true } });
    for (const email of emails) {
      const dataInicioNotif = addDays(startOfDay(new Date(seguro.dataFim)), -email.diasAntecedencia);
      if (isBefore(hoje, new Date(seguro.dataFim)) && (hoje.getTime() >= dataInicioNotif.getTime())) {
        const jaEnviado = await prisma.notificacaoEnviada.findFirst({ where: { entidade: 'Seguro', entidadeId: seguro.id, emailNotificacaoId: email.id } });
        if (!jaEnviado) {
          const dias = differenceInDays(new Date(seguro.dataFim), hoje);
          await enviarEmail({
            para: email.email,
            assunto: `[SIMEC] Alerta: Seguro ${seguro.apoliceNumero} vence em ${dias} dia(s)`,
            dadosTemplate: {
              nomeDestinatario: email.nome || 'Usuário', tituloAlerta: 'Vencimento de Seguro', mensagemPrincipal: `A apólice abaixo vencerá em breve.`,
              detalhes: { 'Nº Apólice': seguro.apoliceNumero, 'Seguradora': seguro.seguradora, 'Vence em': format(new Date(seguro.dataFim), 'dd/MM/yyyy', { locale: ptBR }) },
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
    console.log("[TAREFA PROGRAMADA] Iniciando ciclo de verificações...");
    await atualizarStatusManutencoes(); 
    await gerarAlertasDeProximidadeManutencao();
    await processarSaudeEquipamentos();
    await verificarVencimentoContratos();
    await verificarVencimentoSeguros();
    console.log("[TAREFA PROGRAMADA] Ciclo finalizado com sucesso.");
  } catch (error) {
    console.error('[ERRO GERAL Alertas]:', error);
  }
}