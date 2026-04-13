import { gerarAlertasManutencao } from './alertasManutencaoService.js';
import { gerarAlertasSeguro } from './alertasSeguroService.js';
import { gerarAlertasRecomendacao } from './alertasRecomendacaoService.js';

export async function processarAlertasEEnviarNotificacoes() {
  console.log('[ALERTAS] Iniciando processamento...');

  try {
    const manutencoes = await gerarAlertasManutencao();
    const seguros = await gerarAlertasSeguro();
    const recomendacoes = await gerarAlertasRecomendacao();

    if (global.io) {
      global.io.emit('atualizar-alertas');
      console.log('📢 WebSockets: Notificando navegadores em tempo real!');
    }

    console.log(
      `[ALERTAS] Finalizado | manutencoes=${manutencoes} | seguros=${seguros} | recomendacoes=${recomendacoes}`
    );

    return {
      ok: true,
      manutencoes,
      seguros,
      recomendacoes,
    };
  } catch (error) {
    console.error('[ALERTAS] Erro geral:', error);
    return {
      ok: false,
      manutencoes: 0,
      seguros: 0,
      recomendacoes: 0,
    };
  }
}