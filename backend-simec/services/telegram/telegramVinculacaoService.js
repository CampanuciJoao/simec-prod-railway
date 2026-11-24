// Vinculacao self-service do Telegram privado do usuario.
//
// Fluxo:
//   1. Usuario clica "Vincular meu Telegram" no sino do SIMEC
//   2. Backend gera TelegramVinculacaoToken { tenantId, usuarioId, token, expiresAt }
//   3. Frontend mostra link `t.me/BOT_USERNAME?start=TOKEN` + QR code
//   4. Usuario clica → Telegram abre → aperta "Iniciar" → bot recebe /start TOKEN
//   5. Webhook consome token, cria TelegramNotificacao { tenantId, chatId, usuarioId }
//   6. Frontend polling detecta status=vinculado e fecha modal
//
// Observacao de seguranca: tokens sao curtos (~8 chars) mas tem TTL de 15min
// e sao unicos (constraint @unique). Rate limit implicito: so 1 token ativo
// por usuario (antigos sao invalidados ao gerar novo).

import crypto from 'node:crypto';
import prisma from '../prismaService.js';
import { getBotUsername } from './telegramService.js';

const TOKEN_TTL_MS   = 15 * 60 * 1000; // 15 minutos
const TOKEN_LENGTH   = 8;

function gerarTokenAleatorio() {
  // Alfabeto sem 0/O/I/1 — evita confusao visual no QR/digitacao.
  const alf = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(TOKEN_LENGTH);
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i += 1) {
    out += alf[bytes[i] % alf.length];
  }
  return out;
}

/**
 * Gera (ou reusa) um token ativo pra vincular o Telegram privado do usuario
 * atual. Invalida tokens anteriores do mesmo usuario — garante que so ha 1
 * valido por vez.
 */
export async function gerarTokenParaUsuario({ tenantId, usuarioId }) {
  // Invalida tokens pendentes do usuario (nao usados e nao expirados).
  await prisma.telegramVinculacaoToken.updateMany({
    where: {
      tenantId,
      usuarioId,
      usado: false,
      expiresAt: { gt: new Date() },
    },
    data: { usado: true },
  });

  // Gera um token unico (retry se colidir — astronomicamente improvavel).
  let token;
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    token = gerarTokenAleatorio();
    const existe = await prisma.telegramVinculacaoToken.findUnique({ where: { token } });
    if (!existe) break;
  }

  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.telegramVinculacaoToken.create({
    data: { tenantId, usuarioId, token, expiresAt },
  });

  const botUsername = await getBotUsername();
  const linkTelegram = botUsername
    ? `https://t.me/${botUsername}?start=${token}`
    : null;

  return {
    token,
    expiresAt,
    linkTelegram,
    botUsername,
    ttlSegundos: Math.floor(TOKEN_TTL_MS / 1000),
  };
}

/**
 * Retorna o estado atual da vinculacao Telegram do usuario:
 *   - vinculado: ha um TelegramNotificacao com usuarioId = this
 *   - aguardando: ha token ativo nao-usado
 *   - nao-vinculado: nenhum dos dois
 *
 * Usado pelo polling do modal no frontend e pelo card "Meu Telegram" do perfil.
 */
export async function statusVinculacaoUsuario({ tenantId, usuarioId }) {
  const chat = await prisma.telegramNotificacao.findFirst({
    where: { tenantId, usuarioId, ativo: true },
    select: { id: true, chatId: true, nome: true, createdAt: true, chatType: true },
  });
  if (chat) {
    return {
      status: 'vinculado',
      chat: {
        id: chat.id,
        chatId: chat.chatId,
        nome: chat.nome,
        vinculadoEm: chat.createdAt,
        chatType: chat.chatType,
      },
    };
  }

  const tokenAtivo = await prisma.telegramVinculacaoToken.findFirst({
    where: {
      tenantId,
      usuarioId,
      usado: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: { token: true, expiresAt: true },
  });

  const botUsername = await getBotUsername();

  if (tokenAtivo) {
    return {
      status: 'aguardando',
      token: tokenAtivo.token,
      expiresAt: tokenAtivo.expiresAt,
      linkTelegram: botUsername
        ? `https://t.me/${botUsername}?start=${tokenAtivo.token}`
        : null,
      botUsername,
    };
  }

  return { status: 'nao-vinculado', botUsername };
}

/**
 * Remove o vinculo Telegram privado do usuario. Nao afeta chats de grupo
 * do tenant (que tem usuarioId null).
 */
export async function desvincularUsuario({ tenantId, usuarioId }) {
  const r = await prisma.telegramNotificacao.deleteMany({
    where: { tenantId, usuarioId },
  });
  return { ok: true, removidos: r.count };
}
