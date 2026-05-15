// Gerencia o alerta interno GEHC_DOWNLOADER_FALHA_SISTEMICA.
//
// Idempotente: 1 alerta unico por (tenant, tipoEvento). Atualiza em vez de
// duplicar. Auto-resolve (delete) na proxima execucao com sucesso.
//
// NAO tem flag no Telegram — fica so no sino do SIMEC e na pagina /alertas.

import prisma from '../prismaService.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';

const ID_ALERTA = (tenantId) => `gehc-downloader-falha-sistemica-${tenantId}`;

export async function dispararAlertaFalhaSistemica({ tenantId, mensagem, qtdConsecutivas }) {
  const id = ID_ALERTA(tenantId);
  const titulo = 'Atenção: captura de PDFs GE com problema';
  const subtitulo = `${qtdConsecutivas} downloads consecutivos falharam — verifique a integração GE`;

  try {
    await prisma.alerta.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        tipo: 'Alerta',
        tipoCategoria: ALERT_CATEGORIAS.INTEGRACAO_INTERNA,
        tipoEvento: ALERT_EVENTOS.GEHC_DOWNLOADER_FALHA_SISTEMICA,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        titulo,
        subtitulo: `${subtitulo}. ${mensagem || ''}`.trim().slice(0, 500),
        data: new Date(),
        telegramEnviado: true, // marca como enviado pra NUNCA ir pro Telegram
        emailEnviado: true,
        link: '/gerenciamento/integracoes',
      },
      update: {
        subtitulo: `${subtitulo}. ${mensagem || ''}`.trim().slice(0, 500),
        data: new Date(),
      },
    });
  } catch (e) {
    console.error('[GEHC_DOWNLOADER_ALERTA] Falha ao criar alerta:', e.message);
  }
}

// Resolve (apaga) o alerta quando a captura voltar a funcionar.
// Chamado quando uma execucao do backfill termina sem falha sistemica E
// teve pelo menos 1 captura de sucesso.
export async function resolverAlertaFalhaSistemica({ tenantId }) {
  const id = ID_ALERTA(tenantId);
  try {
    await prisma.alerta.deleteMany({ where: { id, tenantId } });
  } catch (e) {
    console.error('[GEHC_DOWNLOADER_ALERTA] Falha ao resolver alerta:', e.message);
  }
}
