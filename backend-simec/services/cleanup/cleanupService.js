import prisma from '../prismaService.js';

const RETENCAO_ALERTAS_DIAS   = 90;
const RETENCAO_SESSOES_DIAS   = 30;
const RETENCAO_MENSAGENS_DIAS = 60;

const BATCH_ARQUIVO = 500;

function diasAtras(dias) {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

/**
 * Arquiva alertas antigos em `alertas_historico` antes de removê-los.
 * IBM Maximo / compliance: todo alerta deve ser rastreável mesmo após expirar.
 */
export async function limparAlertasAntigos() {
  const corte = diasAtras(RETENCAO_ALERTAS_DIAS);

  const alertasParaArquivar = await prisma.alerta.findMany({
    where: { data: { lt: corte } },
    select: {
      id: true,
      tenantId: true,
      titulo: true,
      subtitulo: true,
      tipo: true,
      tipoCategoria: true,
      tipoEvento: true,
      prioridade: true,
      link: true,
      numeroOS: true,
      data: true,
    },
  });

  if (alertasParaArquivar.length === 0) {
    console.log('[CLEANUP] Alertas: nenhum a arquivar.');
    return 0;
  }

  // Inserção em lotes para não estourar memória com volumes grandes
  for (let i = 0; i < alertasParaArquivar.length; i += BATCH_ARQUIVO) {
    const lote = alertasParaArquivar.slice(i, i + BATCH_ARQUIVO);

    await prisma.alertaHistorico.createMany({
      data: lote.map((a) => ({
        tenantId:      a.tenantId,
        alertaId:      a.id,
        titulo:        a.titulo,
        subtitulo:     a.subtitulo,
        tipo:          a.tipo,
        tipoCategoria: a.tipoCategoria,
        tipoEvento:    a.tipoEvento,
        prioridade:    a.prioridade.toString(),
        link:          a.link,
        numeroOS:      a.numeroOS,
        dataAlerta:    a.data,
        motivoArquivo: 'retencao_automatica',
      })),
      skipDuplicates: true,
    });
  }

  // Deleta após arquivar — AlertaLidoPorUsuario cascateia automaticamente
  const result = await prisma.alerta.deleteMany({
    where: { data: { lt: corte } },
  });

  console.log(
    `[CLEANUP] Alertas arquivados=${alertasParaArquivar.length} | removidos=${result.count} (anteriores a ${corte.toISOString().slice(0, 10)})`
  );
  return result.count;
}

/**
 * Remove sessões do agente concluídas/canceladas/expiradas.
 * CORREÇÃO: enum usa PascalCase (Finalizada, Cancelada, Expirada) — não UPPERCASE.
 */
export async function limparSessoesAgente() {
  const corte = diasAtras(RETENCAO_SESSOES_DIAS);

  // AgentMessage cascateia via onDelete: Cascade no schema
  const result = await prisma.agentSession.deleteMany({
    where: {
      status: { in: ['Finalizada', 'Cancelada', 'Expirada'] },
      updatedAt: { lt: corte },
    },
  });

  console.log(`[CLEANUP] Sessões do agente removidas: ${result.count}`);
  return result.count;
}

/**
 * Remove mensagens órfãs de sessões concluídas com mais de 60 dias.
 */
export async function limparMensagensOrfas() {
  const corte = diasAtras(RETENCAO_MENSAGENS_DIAS);

  const result = await prisma.agentMessage.deleteMany({
    where: {
      createdAt: { lt: corte },
      session: {
        status: { in: ['Finalizada', 'Cancelada', 'Expirada'] },
      },
    },
  });

  console.log(`[CLEANUP] Mensagens do agente removidas: ${result.count}`);
  return result.count;
}

export async function executarCleanupCompleto() {
  console.log('[CLEANUP] Iniciando rotina de retenção de dados...');

  const [alertas, sessoes, mensagens] = await Promise.allSettled([
    limparAlertasAntigos(),
    limparSessoesAgente(),
    limparMensagensOrfas(),
  ]);

  const totalAlerts  = alertas.status  === 'fulfilled' ? alertas.value  : 0;
  const totalSessoes = sessoes.status  === 'fulfilled' ? sessoes.value  : 0;
  const totalMsgs    = mensagens.status === 'fulfilled' ? mensagens.value : 0;

  if (alertas.status   === 'rejected') console.error('[CLEANUP] Erro em alertas:',   alertas.reason?.message);
  if (sessoes.status   === 'rejected') console.error('[CLEANUP] Erro em sessões:',   sessoes.reason?.message);
  if (mensagens.status === 'rejected') console.error('[CLEANUP] Erro em mensagens:', mensagens.reason?.message);

  console.log(
    `[CLEANUP] Concluído | alertas=${totalAlerts} | sessões=${totalSessoes} | mensagens=${totalMsgs}`
  );

  return { alertas: totalAlerts, sessoes: totalSessoes, mensagens: totalMsgs };
}
