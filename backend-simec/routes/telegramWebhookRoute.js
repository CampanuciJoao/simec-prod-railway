import { Router } from 'express';
import prisma from '../services/prismaService.js';
import { enviarMensagem } from '../services/telegram/telegramService.js';

const router = Router();

router.post('/', async (req, res) => {
  res.sendStatus(200);

  const message = req.body?.message;
  if (!message?.text) return;

  const chatId = String(message.chat.id);
  const texto  = message.text.trim();
  const nome   = message.from?.first_name || message.chat?.title || null;

  if (texto === '/start' || texto.startsWith('/start ')) {
    await enviarMensagem(
      chatId,
      '👋 Olá! Sou o bot de alertas do <b>SIMEC</b>.\n\n' +
      'Para vincular este chat ao seu tenant, gere um código em:\n' +
      '<i>Cadastros → Notificações Telegram → Vincular via código</i>\n\n' +
      'Depois envie:\n<code>/conectar SEU_CODIGO</code>'
    ).catch(() => {});
    return;
  }

  if (texto.startsWith('/conectar')) {
    const token = texto.split(/\s+/)[1]?.toUpperCase();

    if (!token) {
      await enviarMensagem(chatId,
        '❌ Informe o código gerado no SIMEC.\nExemplo: <code>/conectar AB12CD34</code>'
      ).catch(() => {});
      return;
    }

    const record = await prisma.telegramVinculacaoToken.findUnique({ where: { token } });

    if (!record || record.usado || record.expiresAt < new Date()) {
      await enviarMensagem(chatId,
        '❌ Código inválido ou expirado.\nGere um novo código no SIMEC e tente novamente.'
      ).catch(() => {});
      return;
    }

    const jaVinculado = await prisma.telegramNotificacao.findFirst({
      where: { tenantId: record.tenantId, chatId },
    });

    if (jaVinculado) {
      await prisma.telegramVinculacaoToken.update({ where: { token }, data: { usado: true, chatId } });
      await enviarMensagem(chatId, '✅ Este chat já está vinculado ao SIMEC e recebendo alertas.').catch(() => {});
      return;
    }

    await prisma.$transaction([
      prisma.telegramVinculacaoToken.update({ where: { token }, data: { usado: true, chatId } }),
      prisma.telegramNotificacao.create({
        data: { tenantId: record.tenantId, chatId, nome },
      }),
    ]);

    await enviarMensagem(
      chatId,
      '✅ <b>Vinculação concluída!</b>\n\n' +
      'Este chat agora recebe alertas do SIMEC.\n' +
      'Configure os tipos de alerta em:\n' +
      '<i>Cadastros → Notificações Telegram</i>'
    ).catch(() => {});
  }
});

export default router;
