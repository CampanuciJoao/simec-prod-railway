import { Router } from 'express';
import prisma from '../services/prismaService.js';
import { enviarMensagem } from '../services/telegram/telegramService.js';

const router = Router();

// Valida o secret token configurado no Telegram via setWebhook(secret_token=...)
// Variável de ambiente: TELEGRAM_WEBHOOK_SECRET
router.use((req, res, next) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) return next();

  const incoming = req.headers['x-telegram-bot-api-secret-token'];
  if (incoming !== expectedSecret) {
    return res.sendStatus(403);
  }
  next();
});

/**
 * Processa um token de vinculacao que chegou no bot. Cobre os dois formatos:
 *   - /start TOKEN      (deep link t.me/bot?start=TOKEN — fluxo self-service)
 *   - /conectar TOKEN   (fluxo antigo manual admin)
 */
async function processarTokenVinculacao({ chatId, texto, nome, chatType }) {
  const tokenCode = texto.toUpperCase();

  const record = await prisma.telegramVinculacaoToken.findUnique({
    where: { token: tokenCode },
  });

  if (!record || record.usado || record.expiresAt < new Date()) {
    await enviarMensagem(
      chatId,
      '❌ Código inválido ou expirado.\nGere um novo código no SIMEC e tente novamente.'
    ).catch(() => {});
    return;
  }

  // Se token eh de usuario (self-service), marca o TelegramNotificacao com
  // usuarioId. Se nao (fluxo antigo admin), fica sem usuario (grupo).
  const jaVinculado = await prisma.telegramNotificacao.findFirst({
    where: { tenantId: record.tenantId, chatId },
  });

  if (jaVinculado) {
    // Atualiza para refletir o vinculo mais recente — se agora veio com
    // usuarioId e antes nao tinha, "promove" o chat a privado do usuario.
    await prisma.$transaction([
      prisma.telegramVinculacaoToken.update({
        where: { token: tokenCode },
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
    await enviarMensagem(
      chatId,
      record.usuarioId
        ? '✅ <b>Telegram vinculado!</b>\n\nVocê vai receber seus lembretes do SIMEC aqui no privado.'
        : '✅ Este chat já está vinculado ao SIMEC e recebendo alertas.'
    ).catch(() => {});
    return;
  }

  await prisma.$transaction([
    prisma.telegramVinculacaoToken.update({
      where: { token: tokenCode },
      data: { usado: true, chatId },
    }),
    prisma.telegramNotificacao.create({
      data: {
        tenantId:  record.tenantId,
        chatId,
        nome,
        usuarioId: record.usuarioId || null,
        chatType:  chatType || null,
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

  await enviarMensagem(chatId, mensagemOk).catch(() => {});
}

router.post('/', async (req, res) => {
  res.sendStatus(200);

  const message = req.body?.message;
  if (!message?.text) return;

  const chatId   = String(message.chat.id);
  const chatType = message.chat?.type || null;
  const texto    = message.text.trim();
  const nome     = message.from?.first_name || message.chat?.title || null;

  // Deep link: /start TOKEN → vinculacao self-service
  if (texto.startsWith('/start ')) {
    const token = texto.slice('/start '.length).trim();
    if (token) {
      await processarTokenVinculacao({ chatId, texto: token, nome, chatType });
      return;
    }
  }

  // /start sem parametro → mensagem padrao de boas-vindas
  if (texto === '/start') {
    await enviarMensagem(
      chatId,
      '👋 Olá! Sou o bot de alertas do <b>SIMEC</b>.\n\n' +
      'Para vincular este chat ao seu tenant, gere um código em:\n' +
      '<i>Cadastros → Notificações Telegram → Vincular via código</i>\n\n' +
      'Depois envie:\n<code>/conectar SEU_CODIGO</code>\n\n' +
      'Ou peça no SIMEC um link de vinculação pessoal e clique nele.'
    ).catch(() => {});
    return;
  }

  // Fluxo antigo (admin)
  if (texto.startsWith('/conectar')) {
    const token = texto.split(/\s+/)[1];
    if (!token) {
      await enviarMensagem(chatId,
        '❌ Informe o código gerado no SIMEC.\nExemplo: <code>/conectar AB12CD34</code>'
      ).catch(() => {});
      return;
    }
    await processarTokenVinculacao({ chatId, texto: token, nome, chatType });
  }
});

export default router;
