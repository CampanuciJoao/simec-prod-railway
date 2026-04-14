import { processarAlertasEEnviarNotificacoes } from './alertas/alertasOrchestrator.js';

export async function executarCicloInteligente() {
  const inicio = new Date();

  console.log('[INTELLIGENCE] Iniciando ciclo inteligente...');

  let notificacoesProcessadas = false;

  try {
    await processarAlertasEEnviarNotificacoes();
    notificacoesProcessadas = true;
  } catch (error) {
    console.error(
      '[INTELLIGENCE] Erro ao processar alertas/notificações:',
      error
    );
  }

  const fim = new Date();
  const duracaoMs = fim.getTime() - inicio.getTime();

  console.log(
    `[INTELLIGENCE] Ciclo concluído | notificacoes=${notificacoesProcessadas} | duracaoMs=${duracaoMs}`
  );

  return {
    ok: true,
    notificacoesProcessadas,
    duracaoMs,
  };
}

export default executarCicloInteligente;