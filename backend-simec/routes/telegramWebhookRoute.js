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
      ? '✅ <b>Telegram vinculado com sucesso!</b>\n\n' +
        'Seus lembretes do SIMEC vão chegar aqui no chat privado.'
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
        try {
          await processarTokenVinculacao({ chatId, tokenCode: token, nome, chatType });
          console.log(`[TG_WH/${botTipo}] processarTokenVinculacao OK pra chatId=${chatId}`);
        } catch (err) {
          console.error(`[TG_WH/${botTipo}] processarTokenVinculacao FALHOU:`, err.message, err.stack);
          // Tenta avisar o usuario no chat que algo quebrou
          await enviarMensagem(
            chatId,
            `⚠️ Erro interno ao vincular. Avise o administrador.\n<code>${err.message}</code>`,
            botTipo,
          ).catch((e) => console.error(`[TG_WH/${botTipo}] msg de erro tambem falhou:`, e.message));
        }
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

    // /sair ou /desativar — usuario pede pra parar de receber neste chat.
    // Desativa o TelegramNotificacao correspondente SEM deletar — permite
    // reativacao futura via /entrar ou via painel admin.
    if (texto === '/sair' || texto === '/desativar') {
      try {
        const r = await prisma.telegramNotificacao.updateMany({
          where: { chatId, botTipo, ativo: true },
          data: { ativo: false },
        });
        const msg = r.count > 0
          ? (botTipo === 'LEMBRETES'
              ? '👋 Pronto, você não vai mais receber lembretes aqui.\nPra voltar, mande /entrar.'
              : '👋 Pronto, este chat não vai mais receber alertas do SIMEC.\nPra voltar, mande /entrar.')
          : 'ℹ️ Este chat já estava desativado (ou nunca foi vinculado).';
        await enviarMensagem(chatId, msg, botTipo).catch((e) =>
          console.error(`[TG_WH/${botTipo}] msg /sair falhou:`, e.message));
      } catch (err) {
        console.error(`[TG_WH/${botTipo}] /sair falhou:`, err.message);
      }
      return;
    }

    // /entrar ou /ativar — reativa chat desativado.
    if (texto === '/entrar' || texto === '/ativar') {
      try {
        const r = await prisma.telegramNotificacao.updateMany({
          where: { chatId, botTipo, ativo: false },
          data: { ativo: true },
        });
        const msg = r.count > 0
          ? (botTipo === 'LEMBRETES'
              ? '✅ Reativado. Você vai receber seus lembretes aqui novamente.'
              : '✅ Reativado. Este chat volta a receber alertas do SIMEC.')
          : 'ℹ️ Este chat já está ativo (ou nunca foi vinculado).';
        await enviarMensagem(chatId, msg, botTipo).catch((e) =>
          console.error(`[TG_WH/${botTipo}] msg /entrar falhou:`, e.message));
      } catch (err) {
        console.error(`[TG_WH/${botTipo}] /entrar falhou:`, err.message);
      }
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
      try {
        await processarTokenVinculacao({ chatId, tokenCode: token, nome, chatType });
      } catch (err) {
        console.error(`[TG_WH/${botTipo}] processarTokenVinculacao(/conectar) FALHOU:`, err.message, err.stack);
      }
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
