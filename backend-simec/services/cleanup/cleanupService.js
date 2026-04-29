import prisma from '../prismaService.js';

const RETENCAO_ALERTAS_DIAS    = 90;
const RETENCAO_SESSOES_DIAS    = 30;
const RETENCAO_MENSAGENS_DIAS  = 60;

function diasAtras(dias) {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

export async function limparAlertasAntigos() {
  const corte = diasAtras(RETENCAO_ALERTAS_DIAS);

  // AlertaLidoPorUsuario cascades on delete via Prisma schema
  const result = await prisma.alerta.deleteMany({
    where: { data: { lt: corte } },
  });

  console.log(`[CLEANUP] Alertas removidos: ${result.count} (anteriores a ${corte.toISOString().slice(0, 10)})`);
  return result.count;
}

export async function limparSessoesAgente() {
  const corte = diasAtras(RETENCAO_SESSOES_DIAS);

  // AgentMessage cascades from AgentSession
  const result = await prisma.agentSession.deleteMany({
    where: {
      status: { in: ['FINALIZADO', 'CANCELADO', 'EXPIRADA'] },
      updatedAt: { lt: corte },
    },
  });

  console.log(`[CLEANUP] Sessões do agente removidas: ${result.count}`);
  return result.count;
}

export async function limparMensagensOrfas() {
  const corte = diasAtras(RETENCAO_MENSAGENS_DIAS);

  // Mensagens de sessões já expiradas mas sem status explícito
  const result = await prisma.agentMessage.deleteMany({
    where: {
      createdAt: { lt: corte },
      session: {
        status: { in: ['FINALIZADO', 'CANCELADO', 'EXPIRADA'] },
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

  if (alertas.status  === 'rejected') console.error('[CLEANUP] Erro em alertas:',  alertas.reason?.message);
  if (sessoes.status  === 'rejected') console.error('[CLEANUP] Erro em sessões:',  sessoes.reason?.message);
  if (mensagens.status === 'rejected') console.error('[CLEANUP] Erro em mensagens:', mensagens.reason?.message);

  console.log(`[CLEANUP] Concluído | alertas=${totalAlerts} | sessões=${totalSessoes} | mensagens=${totalMsgs}`);

  return { alertas: totalAlerts, sessoes: totalSessoes, mensagens: totalMsgs };
}
