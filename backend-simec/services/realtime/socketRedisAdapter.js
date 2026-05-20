// Plugga o @socket.io/redis-adapter no servidor Socket.io quando o Redis
// estiver disponível. Isso permite múltiplas instâncias do backend
// compartilharem eventos em tempo real (Railway com >1 réplica, blue/green
// deploys, etc.). Se Redis estiver indisponível, o adapter default
// (in-memory) é mantido — degradação graciosa, sem quebrar nada.
//
// Por que duas conexões dedicadas?
//  - O cliente de SUBSCRIBE entra em modo bloqueante (não pode emitir
//    outros comandos), então não dá pra reusar o cliente compartilhado.
//  - Criamos pub e sub separados, baseados nas mesmas opções de conexão.

import IORedis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisConnectionOptions } from '../redis/redisConnectionOptions.js';

const CHANNEL_PREFIX = 'simec_io';

export async function aplicarRedisAdapter(io) {
  if (!io) return false;

  let pub;
  let sub;
  try {
    const baseOpts = {
      ...getRedisConnectionOptions(),
      lazyConnect: true,
      enableOfflineQueue: true,
      maxRetriesPerRequest: null,
    };
    pub = new IORedis(baseOpts);
    sub = new IORedis(baseOpts);

    // Conexões devem estar de pé antes de pluggar o adapter para evitar
    // perda silenciosa dos primeiros eventos.
    await Promise.all([pub.connect(), sub.connect()]);

    pub.on('error', (err) => {
      console.warn('[SOCKET_ADAPTER] pub error:', err.message);
    });
    sub.on('error', (err) => {
      console.warn('[SOCKET_ADAPTER] sub error:', err.message);
    });

    io.adapter(createAdapter(pub, sub, { key: CHANNEL_PREFIX }));
    console.log('[SOCKET_ADAPTER] Redis adapter ativo — eventos cross-instance habilitados.');
    return true;
  } catch (err) {
    console.warn(
      `[SOCKET_ADAPTER] Redis adapter não aplicado (${err.message}). ` +
      'Caindo para adapter in-memory — só seguro com 1 instância do backend.'
    );
    try { await pub?.quit(); } catch { /* ignore */ }
    try { await sub?.quit(); } catch { /* ignore */ }
    return false;
  }
}
