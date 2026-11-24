import { Router } from 'express';
import prisma from '../services/prismaService.js';
import { enviarMensagem } from '../services/telegram/telegramService.js';

/**
 * Factory de router pra webhook de Telegram. O SIMEC opera 2 bots:
 *   - ALERTAS   → webhook em /api/telegram/webhook
 *   - LEMBRETES → webhook em /api/telegram/webhook-lembretes
 *
 * Cada rota passa seu proprio `botTipo` pra este factory. O secret token do
 * webhook tambem e configuravel por bot via env:
 *   - TELEGRAM_WEBHOOK_SECRET            (ALERTAS)
 *   - TELEGRAM_LEMBRETES_WEBHOOK_SECRET  (LEMBRETES)
 */
export function criarWebhookRouter({ botTipo, secretEnv }) {
  const router = Router();

  // Valida o secret token configurado via setWebhook(secret_token=...)
  router.use((req, res, next) => {
    const expectedSecret = process.env[secretEnv];
    if (!expectedSecret) return next();

    const incoming = req.headers['x-telegram-bot-api-secret-token'];
    if (incoming !== expectedSecret) {
      return res.sendStatus(403);
    }
    next();
  });

  /**
   * Processa token de vinculacao. Cobre 2 formatos:
   *   - /start TOKEN      (deep link t.me/bot?start=TOKEN — self-service)
   *   - /conectar TOKEN   (fluxo manual admin antigo)
   *
   * Importante: valida que o token foi gerado pro MESMO bot que recebeu a
   * mensagem. Impede que o token de ALERTAS seja usado no LEMBRETES ou
   * vice-versa (confusao do usuario que abre o link do bot errado).
   */
  async function processarTokenVinculacao({ chatId, tokenCode, nome, chatType }) {
    const tokenUp = tokenCode.toUpperCase();

    const record = await prisma.telegramVinculacaoToken.findUnique({
      where: { token: tokenUp },
    });

    if (!record || record.usado || record.expiresAt < new Date()) {
      await enviarMensagem(chatId,
        '❌ Código inválido ou expirado.\nGere um novo código no SIMEC e tente novamente.',
        botTipo,
      ).catch((e) => console.error(`[TG_WH/${botTipo}] enviarMensagem falhou:`, e.message));
      return;
    }

    if (record.botTipo !== botTipo) {
      await enviarMensagem(chatId,
        `❌ Este código é pra o outro bot (${record.botTipo}). Abra o link certo no SIMEC.`,
        botTipo,
      ).catch((e) => console.error(`[TG_WH/${botTipo}] enviarMensagem falhou:`, e.message));
      return;
    }

    const jaVinculado = await prisma.telegramNotificacao.findFirst({
      where: { tenantId: record.tenantId, chatId, botTipo },
    });

    if (jaVinculado) {
      await prisma.$transaction([
        prisma.telegramVinculacaoToken.update({
          where: { token: tokenUp },
          data: { usado: true, chatId },
        }),
        prisma.telegramNotificacao.update({
          where: { id: jaVinculado.id },
          data: {
            usuarioId: record.usuarioId || jaVinculado.usuarioId,
            chatType: chatType || jaVinculado.chatType,
            ativo: true,
          },
        }),
      ]);
      await enviarMensagem(chatId,
        record.usuarioId
          ? '✅ <b>Telegram vinculado!</b>\n\nVocê vai receber seus lembretes do SIMEC aqui no privado.'
          : '✅ Este chat já está vinculado ao SIMEC e recebendo alertas.',
        botTipo,
      ).catch((e) => console.error(`[TG_WH/${botTipo}] enviarMensagem falhou:`, e.message));
      return;
    }

    await prisma.$transaction([
      prisma.telegramVinculacaoToken.update({
        where: { token: tokenUp },
        data: { usado: true, chatId },
      }),
      prisma.telegramNotificacao.create({
        data: {
          tenantId:  record.tenantId,
          chatId,
          nome,
          usuarioId: record.usuarioId || null,
          chatType:  chatType || null,
          botTipo,
        },
      }),
    ]);

    const mensagemOk = record.usuarioId
      ? '✅ <b>Telegram vinculado!</b>\n\n' +
        'Pronto — você vai receber seus lembretes do SIMEC aqui no privado, ' +
        'sem incomodar o grupo.'
      : '✅ <b>Vinculação concluída!</b>\n\n' +
        'Este chat agora recebe alertas do SIMEC.\n' +
        'Configure os tipos de alerta em:\n' +
        '<i>Cadastros → Notificações Telegram</i>';

    await enviarMensagem(chatId, mensagemOk, botTipo).catch((e) => console.error(`[TG_WH/${botTipo}] enviarMensagem falhou:`, e.message));
  }

  router.post('/', async (req, res) => {
    res.sendStatus(200);

    const message = req.body?.message;
    if (!message?.text) {
      console.log(`[TG_WH/${botTipo}] update sem message.text — ignorado`);
      return;
    }

    const chatId   = String(message.chat.id);
    const chatType = message.chat?.type || null;
    const texto    = message.text.trim();
    const nome     = message.from?.first_name || message.chat?.title || null;

    console.log(`[TG_WH/${botTipo}] recebido de chatId=${chatId} (${chatType}) texto="${texto.slice(0, 80)}"`);

    // /start TOKEN → self-service
    if (texto.startsWith('/start ')) {
      const token = texto.slice('/start '.length).trim();
      if (token) {
        await processarTokenVinculacao({ chatId, tokenCode: token, nome, chatType });
        return;
      }
    }

    if (texto === '/start') {
      const msgAlertas = '👋 Olá! Sou o bot de <b>alertas</b> do SIMEC.\n\n' +
        'Para vincular este chat, gere um código em:\n' +
        '<i>Cadastros → Notificações Telegram → Vincular via código</i>\n\n' +
        'Depois envie:\n<code>/conectar SEU_CODIGO</code>';
      const msgLembretes = '👋 Olá! Sou o bot de <b>lembretes</b> do SIMEC.\n\n' +
        'Pra vincular este chat ao seu usuário, gere um link no SIMEC em:\n' +
        '<i>Sino → aba Lembretes → "Meu Telegram"</i>\n\n' +
        'Depois clique no link e aperte "Iniciar" — eu vinculo automaticamente.';
      await enviarMensagem(chatId, botTipo === 'LEMBRETES' ? msgLembretes : msgAlertas, botTipo).catch((e) => console.error(`[TG_WH/${botTipo}] enviarMensagem falhou:`, e.message));
      return;
    }

    if (texto.startsWith('/conectar')) {
      const token = texto.split(/\s+/)[1];
      if (!token) {
        await enviarMensagem(chatId,
          '❌ Informe o código gerado no SIMEC.\nExemplo: <code>/conectar AB12CD34</code>',
          botTipo,
        ).catch((e) => console.error(`[TG_WH/${botTipo}] enviarMensagem falhou:`, e.message));
        return;
      }
      await processarTokenVinculacao({ chatId, tokenCode: token, nome, chatType });
    }
  });

  return router;
}

// Router default: ALERTAS (retrocompatibilidade — /api/telegram/webhook segue
// apontando pro bot de alertas, como sempre esteve).
export default criarWebhookRouter({
  botTipo: 'ALERTAS',
  secretEnv: 'TELEGRAM_WEBHOOK_SECRET',
});
