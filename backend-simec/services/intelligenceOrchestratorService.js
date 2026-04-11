import { gerarRecomendacoesProativasDeManutencao } from './maintenanceRecommendationService.js';
import { processarAlertasEEnviarNotificacoes } from './alertasService.js';

function isUniqueConstraintError(error) {
  return error?.code === 'P2002';
}

export async function executarCicloInteligente() {
  const inicio = new Date();

  console.log('[INTELLIGENCE] Iniciando ciclo inteligente...');

  let recomendacoesGeradas = 0;
  let notificacoesProcessadas = false;

  try {
    recomendacoesGeradas = await gerarRecomendacoesProativasDeManutencao();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      console.warn('[INTELLIGENCE] Recomendação duplicada ignorada:', error.message);
    } else {
      console.error('[INTELLIGENCE] Erro ao gerar recomendações proativas:', error);
    }
  }

  try {
    await processarAlertasEEnviarNotificacoes();
    notificacoesProcessadas = true;
  } catch (error) {
    console.error('[INTELLIGENCE] Erro ao processar alertas/notificações:', error);
  }

  const fim = new Date();
  const duracaoMs = fim.getTime() - inicio.getTime();

  console.log(
    `[INTELLIGENCE] Ciclo concluído | recomendações=${recomendacoesGeradas} | notificacoes=${notificacoesProcessadas} | duracaoMs=${duracaoMs}`
  );

  return {
    ok: true,
    recomendacoesGeradas,
    notificacoesProcessadas,
    duracaoMs
  };
}