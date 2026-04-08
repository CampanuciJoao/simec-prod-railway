// Ficheiro: simec/backend-simec/services/alertasService.js

import prisma from './prismaService.js';
import { enviarEmail } from './emailService.js';
import { addDays, isBefore, isAfter, differenceInDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Função auxiliar para obter o horário atual (Servidor em Campo Grande)
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
    for (const manut of manutsParaConfirmar) {
      await prisma.$transaction(async (tx) => {
        await tx.manutencao.update({ where: { id: manut.id }, data: { status: 'AguardandoConfirmacao' } });
        await tx.equipamento.update({ where: { id: manut.equipamentoId }, data: { status: 'EmManutencao' } });

        const eq = manut.equipamento.modelo;
        const u = manut.equipamento.unidade?.nomeSistema || "N/A";
        
        // FRASE NATURAL EXATA (Ativa negrito no Frontend)
        const novoTitulo = `Confirmar manutenção da ${eq} em ${u}`;

        await tx.alerta.upsert({
          where: { id: `manut-confirm-${manut.id}` },
          update: { titulo: novoTitulo },
          create: {
            id: `manut-confirm-${manut.id}`,
            titulo: novoTitulo,
            // AQUI: Formato exato para o Frontend recortar o número da OS
            subtitulo: `OS ${manut.numeroOS} - O prazo expirou. Confirme o status.`,
            data: agora,
            prioridade: 'Alta',
            tipo: 'Manutenção',
            link: `/manutencoes/detalhes/${manut.id}`
          }
        });
      });
    }
  }

  // --- 2. INÍCIO AUTOMÁTICO (Agressivo: 1 minuto de margem para evitar atrasos) ---
  const margemInicio = new Date(agora.getTime() + 60000); // Olha 1 minuto no futuro
  const manutsParaIniciar = await prisma.manutencao.findMany({
    where: { 
        status: 'Agendada', 
        dataHoraAgendamentoInicio: { lte: margemInicio },
        dataHoraAgendamentoFim: { gt: agora } 
    },
    include: { equipamento: { include: { unidade: true } } }
  });

  if (manutsParaIniciar.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const manut of manutsParaIniciar) {
        await tx.equipamento.update({ where: { id: manut.equipamentoId }, data: { status: 'EmManutencao' } });
        await tx.manutencao.update({ where: { id: manut.id }, data: { status: 'EmAndamento', dataInicioReal: manut.dataHoraAgendamentoInicio } });
        
        const eq = manut.equipamento.modelo;
        const u = manut.equipamento.unidade?.nomeSistema || "N/A";
        
        // FRASE NATURAL EXATA (Ativa negrito no Frontend)
        const novoTitulo = `Manutenção iniciada na ${eq} de ${u}`;

        await tx.alerta.upsert({
          where: { id: `manut-iniciada-${manut.id}` },
          update: { titulo: novoTitulo },
          create: {
            id: `manut-iniciada-${manut.id}`,
            titulo: novoTitulo,
            // AQUI: Formato exato para o Frontend recortar o número da OS
            subtitulo: `OS ${manut.numeroOS} - Iniciada automaticamente.`,
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
  // Retirado a palavra "em" do texto para não ficar redundante com o "inicia em" do título
  const PONTOS_INICIO = [
    { limiar: 10, prioridade: 'Alta', label: '10min', texto: '10 minutos' },
    { limiar: 60, prioridade: 'Media', label: '1h', texto: '1 hora' },
    { limiar: 1440, prioridade: 'Baixa', label: '24h', texto: '24 horas' },
  ];

  const manutencoesProximas = await prisma.manutencao.findMany({
    where: { status: 'Agendada', dataHoraAgendamentoInicio: { gt: agora } },
    include: { equipamento: { include: { unidade: true } } }
  });

  for (const manut of manutencoesProximas) {
    // Math.floor para precisão nos minutos exatos
    const minRestantes = Math.floor((manut.dataHoraAgendamentoInicio.getTime() - agora.getTime()) / 60000);
    
    for (const ponto of PONTOS_INICIO) {
      // Cria uma margem de 1 minuto para não perder nenhum alerta entre os "tiques" do relógio
      if (minRestantes <= ponto.limiar && minRestantes >= (ponto.limiar - 1)) {
        const idAlerta = `manut-prox-início-${manut.id}-${ponto.label}`;
        
        const eq = manut.equipamento.modelo;
        const u = manut.equipamento.unidade?.nomeSistema || "N/A";
        
        // FRASE NATURAL EXATA (Reconhecida pelo Frontend para aplicar negrito e cores)
        const novoTitulo = `Manutenção na ${eq} de ${u}, inicia em ${ponto.texto}`;

        await prisma.alerta.upsert({
          where: { id: idAlerta },
          update: { titulo: novoTitulo }, // FORÇA A ATUALIZAÇÃO DO TÍTULO
          create: {
            id: idAlerta,
            titulo: novoTitulo,
            subtitulo: `OS ${manut.numeroOS} - Agendado para ${format(manut.dataHoraAgendamentoInicio, 'HH:mm')}`,
            data: manut.dataHoraAgendamentoInicio,
            prioridade: ponto.prioridade,
            tipo: 'Manutenção',
            link: `/manutencoes/detalhes/${manut.id}`
          }
        });
        break; // Impede gerar múltiplos alertas de tempos diferentes para a mesma OS
      }
    }
  }
}

export async function processarSaudeEquipamentos() {
  const umAnoAtras = addDays(getAgora(), -365);
  const equipamentos = await prisma.equipamento.findMany({
    include: { 
        unidade: true,
        ocorrencias: { where: { data: { gte: umAnoAtras } } } 
    }
  });

  for (const eq of equipamentos) {
    const score = eq.ocorrencias.reduce((acc, occ) => acc + (occ.resolvido ? (occ.tipo === 'Infraestrutura' ? 3 : 1) : 0), 0);
    if (score >= 10) {
      const idAlerta = `alerta-saude-${eq.id}-${getAgora().getMonth()}`;
      const unidade = eq.unidade?.nomeSistema || "N/A";
      const novoTitulo = `Risco de falha crítico na unidade de ${unidade}, no equipamento ${eq.modelo} (${eq.tag})`;

      await prisma.alerta.upsert({
        where: { id: idAlerta },
        update: { titulo: novoTitulo },
        create: {
          id: idAlerta,
          titulo: novoTitulo,
          subtitulo: `Este ativo atingiu um nível elevado de reincidência de falhas.`,
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

    // --- LINHA PROFISSIONAL: EMPURRA A ATUALIZAÇÃO PARA O FRONTEND (WEBSOCKETS) ---
    if (global.io) {
        global.io.emit('atualizar-alertas');
        console.log("📢 WebSockets: Notificando navegadores em tempo real!");
    }

    console.log("[TAREFA PROGRAMADA] Ciclo finalizado com sucesso.");
  } catch (error) {
    console.error('[ERRO GERAL Alertas]:', error);
  }
}