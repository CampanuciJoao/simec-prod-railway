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
import {
  gerarTokenParaUsuario,
  statusVinculacaoUsuario,
  desvincularUsuario,
} from '../services/telegram/telegramVinculacaoService.js';

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
    where: { tenantId: req.tenantContext },
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
      data: { tenantId: req.tenantContext, chatId: String(chatId), nome: nome || null, ...prefs },
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
    where: { id: req.params.id, tenantId: req.tenantContext },
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
    where: { id: req.params.id, tenantId: req.tenantContext },
  });
  if (!dest) return res.status(404).json({ erro: 'Destinatário não encontrado.' });
  await prisma.telegramNotificacao.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Gerar token de vinculação (válido por 10 min)
router.post('/gerar-token', proteger, admin, async (req, res) => {
  const tenantId = req.tenantContext;

  await prisma.telegramVinculacaoToken.updateMany({
    where: { tenantId, usado: false },
    data: { usado: true },
  });

  const token = crypto.randomBytes(4).toString('hex').toUpperCase();
  const record = await prisma.telegramVinculacaoToken.create({
    data: {
      tenantId,
      token,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  res.json({ token: record.token, expiresAt: record.expiresAt });
});

// ─── Vinculacao self-service do Telegram privado do USUARIO ──────────────────
// Nao exige admin. Qualquer usuario autenticado pode vincular seu proprio
// Telegram particular pra receber lembretes no privado.

// POST /api/telegram/vincular/gerar-token
router.post('/vincular/gerar-token', proteger, async (req, res) => {
  try {
    const r = await gerarTokenParaUsuario({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.status(201).json(r);
  } catch (err) {
    console.error('[TELEGRAM_VINCULAR_TOKEN]', err);
    res.status(500).json({ message: 'Erro ao gerar token de vinculacao.' });
  }
});

// GET /api/telegram/vincular/status — polling do modal
router.get('/vincular/status', proteger, async (req, res) => {
  try {
    const r = await statusVinculacaoUsuario({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.json(r);
  } catch (err) {
    console.error('[TELEGRAM_VINCULAR_STATUS]', err);
    res.status(500).json({ message: 'Erro ao consultar status.' });
  }
});

// GET /api/telegram/vincular/debug — diagnostico rapido: quais envs TELEGRAM_*
// estao presentes e se o getMe de cada bot responde. Nao expoe valores das
// envs nem tokens — so lista nomes e resultado da chamada.
router.get('/vincular/debug', proteger, async (req, res) => {
  const envsTelegram = Object.keys(process.env)
    .filter((k) => k.toUpperCase().startsWith('TELEGRAM'))
    .sort();

  async function testarBot(botTipo) {
    try {
      const { obterInfoBot, telegramConfigurado } = await import('../services/telegram/telegramService.js');
      if (!telegramConfigurado(botTipo)) return { configurado: false };
      const info = await obterInfoBot(botTipo);
      return { configurado: true, ok: true, username: info?.username, nome: info?.first_name };
    } catch (err) {
      return { configurado: true, ok: false, erro: err.message };
    }
  }

  const [alertas, lembretes] = await Promise.all([testarBot('ALERTAS'), testarBot('LEMBRETES')]);

  res.json({
    envsTelegramPresentes: envsTelegram,
    bots: { ALERTAS: alertas, LEMBRETES: lembretes },
    nodeEnv: process.env.NODE_ENV || null,
    railwayPublicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || null,
    backendUrl: process.env.BACKEND_URL || null,
  });
});

// DELETE /api/telegram/vincular — desvincula o Telegram privado do usuario
router.delete('/vincular', proteger, async (req, res) => {
  try {
    const r = await desvincularUsuario({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.json(r);
  } catch (err) {
    console.error('[TELEGRAM_DESVINCULAR]', err);
    res.status(500).json({ message: 'Erro ao desvincular.' });
  }
});

export default router;
