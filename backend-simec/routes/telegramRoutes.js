import { Router } from 'express';
import crypto from 'node:crypto';
import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import {
  enviarMensagem,
  registrarWebhook,
  obterInfoBot,
  telegramConfigurado,
} from '../services/telegram/telegramService.js';

const router = Router();

// Status do bot (para o frontend saber se está configurado)
router.get('/status', proteger, async (_req, res) => {
  if (!telegramConfigurado()) return res.json({ configurado: false, bot: null });
  try {
    const bot = await obterInfoBot();
    res.json({ configurado: true, bot });
  } catch {
    res.json({ configurado: false, bot: null });
  }
});

// Configurar webhook (admin)
router.post('/configurar-webhook', proteger, admin, async (req, res) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) return res.status(400).json({ erro: 'webhookUrl obrigatório.' });
  try {
    const resultado = await registrarWebhook(webhookUrl);
    res.json({ ok: true, resultado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Listar destinatários do tenant
router.get('/destinatarios', proteger, admin, async (req, res) => {
  const destinatarios = await prisma.telegramNotificacao.findMany({
    where: { tenantId: req.tenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(destinatarios);
});

// Criar destinatário manualmente (chatId conhecido)
router.post('/destinatarios', proteger, admin, async (req, res) => {
  const { chatId, nome, ...prefs } = req.body;
  if (!chatId) return res.status(400).json({ erro: 'chatId obrigatório.' });
  try {
    const dest = await prisma.telegramNotificacao.create({
      data: { tenantId: req.tenantId, chatId: String(chatId), nome: nome || null, ...prefs },
    });
    res.status(201).json(dest);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ erro: 'chatId já cadastrado para este tenant.' });
    throw err;
  }
});

// Atualizar preferências de um destinatário
router.put('/destinatarios/:id', proteger, admin, async (req, res) => {
  const dest = await prisma.telegramNotificacao.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
  });
  if (!dest) return res.status(404).json({ erro: 'Destinatário não encontrado.' });

  const { chatId: _ignored, tenantId: _t, ...rest } = req.body;
  const updated = await prisma.telegramNotificacao.update({
    where: { id: req.params.id },
    data: rest,
  });
  res.json(updated);
});

// Remover destinatário
router.delete('/destinatarios/:id', proteger, admin, async (req, res) => {
  const dest = await prisma.telegramNotificacao.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
  });
  if (!dest) return res.status(404).json({ erro: 'Destinatário não encontrado.' });
  await prisma.telegramNotificacao.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Gerar token de vinculação (válido por 10 min)
router.post('/gerar-token', proteger, admin, async (req, res) => {
  // Invalida tokens anteriores não usados
  await prisma.telegramVinculacaoToken.updateMany({
    where: { tenantId: req.tenantId, usado: false },
    data: { usado: true },
  });

  const token = crypto.randomBytes(4).toString('hex').toUpperCase();
  const record = await prisma.telegramVinculacaoToken.create({
    data: {
      tenantId: req.tenantId,
      token,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  res.json({ token: record.token, expiresAt: record.expiresAt });
});

// Webhook do Telegram (público — Telegram chama diretamente)
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Responde imediatamente para o Telegram não retentar

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
      '<i>Cadastros → Notificações Telegram → Gerar código</i>\n\n' +
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
