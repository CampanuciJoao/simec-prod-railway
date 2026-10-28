// Watchdog da integracao GEHC: detecta quando o cron de saude parou de
// gerar snapshots e tenta recuperar sozinho antes de alarmar o operador.
//
// Problema que resolve: o cron 'gehc-monitorar-saude' pode parar se o
// worker do Railway reiniciar e perder as referencias dos repeatable
// jobs. Ate ter esse watchdog, o sintoma so aparecia quando um humano
// notava "saude nao atualiza faz dias" (ja ocorreu 3 vezes, inclusive
// um episodio de 8 dias sem sincronizar — out/2026).
//
// Estrategia em 2 niveis:
//   - Lento (3h-6h sem snapshot) → reagenda crons silenciosamente,
//     sem alarmar. Da ao sistema uma chance de se auto-recuperar.
//   - Morto (6h+ sem snapshot) → reagenda crons + delega pra
//     verificarMonitoramentoParado() criar o alerta ALTA, que ja
//     notifica Telegram pelo mecanismo existente.
//
// Estado persistido em Redis (chave 'watchdog:gehc:last_recovery') pra
// evitar flood de tentativas quando o cron roda a cada 30min: so tenta
// reagendar 1x por janela de 2h.

import prisma from '../prismaService.js';
import { reagendarJobsGehc } from '../queueService.js';
import { verificarMonitoramentoParado } from './gehcAlertRepository.js';

const WATCHDOG_LENTO_MS         = 3 * 60 * 60 * 1000;  // 3h
const WATCHDOG_MORTO_MS         = 6 * 60 * 60 * 1000;  // 6h
const COOLDOWN_RECOVERY_MS      = 2 * 60 * 60 * 1000;  // 2h entre tentativas
const REDIS_KEY_LAST_RECOVERY   = 'watchdog:gehc:last_recovery';
const REDIS_TTL_SECONDS         = 24 * 60 * 60;        // 24h

function nowMs() {
  return Date.now();
}

// Le o timestamp da ultima tentativa de recovery no Redis (compartilhado
// entre workers). Usa a connection da queue; se o Redis estiver fora,
// retorna null e o caller trata como "nunca tentou".
async function getUltimaTentativaRecovery(redisConnection) {
  if (!redisConnection) return null;
  try {
    const valor = await redisConnection.get(REDIS_KEY_LAST_RECOVERY);
    return valor ? Number(valor) : null;
  } catch (err) {
    console.warn('[GEHC_WATCHDOG] Falha ao ler ultima tentativa:', err.message);
    return null;
  }
}

async function marcarTentativaRecovery(redisConnection) {
  if (!redisConnection) return;
  try {
    await redisConnection.set(
      REDIS_KEY_LAST_RECOVERY,
      String(nowMs()),
      'EX',
      REDIS_TTL_SECONDS
    );
  } catch (err) {
    console.warn('[GEHC_WATCHDOG] Falha ao marcar tentativa:', err.message);
  }
}

// Decide o estado por tenant a partir da idade do ultimo snapshot.
// Idade Infinity (nenhum snapshot) e tratada como 'morto' — tenant com
// equipamentos GE e nunca capturou nada e sintoma claro de problema.
function classificarEstado(idadeMs) {
  if (idadeMs < WATCHDOG_LENTO_MS) return 'ok';
  if (idadeMs < WATCHDOG_MORTO_MS) return 'lento';
  return 'morto';
}

export async function watchdogSaudeGehc({ redisConnection } = {}) {
  // Lista apenas tenants que tem equipamentos vinculados ao GE — tenant
  // sem integracao nao tem porque alarmar sobre falta de snapshot.
  const tenantsComGehc = await prisma.tenant.findMany({
    where: {
      ativo: true,
      equipamentos: { some: { gehcAssetId: { not: null } } },
    },
    select: { id: true, nome: true },
  });

  if (tenantsComGehc.length === 0) {
    return { ok: true, acao: 'sem_tenants_gehc', tenants: [] };
  }

  const resultados = [];
  let precisaReagendar = false;
  let tenantsMortos    = 0;

  for (const tenant of tenantsComGehc) {
    const ultimoSnapshot = await prisma.gehcSaudeSnapshot.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { capturedAt: 'desc' },
      select: { capturedAt: true },
    });

    const idadeMs = ultimoSnapshot
      ? nowMs() - ultimoSnapshot.capturedAt.getTime()
      : Infinity;
    const estado = classificarEstado(idadeMs);
    const horas  = idadeMs === Infinity ? null : Math.round(idadeMs / 3600000);

    resultados.push({
      tenantId: tenant.id,
      estado,
      horasDesdeUltimoSnapshot: horas,
    });

    if (estado === 'lento' || estado === 'morto') {
      precisaReagendar = true;
    }
    if (estado === 'morto') {
      tenantsMortos++;
    }
  }

  // Se nenhum tenant esta lento/morto: tudo normal. Chama a verificacao
  // pra cada tenant mesmo assim, pra resolver alertas que ficaram abertos
  // de uma falha anterior ja superada.
  if (!precisaReagendar) {
    for (const tenant of tenantsComGehc) {
      await verificarMonitoramentoParado(tenant.id).catch((err) =>
        console.warn(`[GEHC_WATCHDOG] verificarMonitoramentoParado(${tenant.id}) falhou:`, err.message)
      );
    }
    return { ok: true, acao: 'tudo_normal', resultados };
  }

  // Decide se tenta reagendar agora (respeita cooldown de 2h entre
  // tentativas, pra nao floodar reagendamento quando ja esta sendo
  // tentado — o reagendamento proprio nao e caro, mas a captura
  // imediata que ele dispara envolve login no portal GE).
  const ultimaTentativa = await getUltimaTentativaRecovery(redisConnection);
  const podeReagendar = !ultimaTentativa
    || (nowMs() - ultimaTentativa) >= COOLDOWN_RECOVERY_MS;

  let acaoReagendamento = 'cooldown';
  if (podeReagendar) {
    try {
      const r = await reagendarJobsGehc();
      await marcarTentativaRecovery(redisConnection);
      acaoReagendamento = r?.ok === false ? 'tentou_mas_falhou' : 'reagendou';
      console.log(
        `[GEHC_WATCHDOG] Auto-recovery acionado — lento/morto detectado em ${resultados.length} tenant(s). Resultado: ${acaoReagendamento}`
      );
    } catch (err) {
      acaoReagendamento = 'tentou_mas_falhou';
      console.error('[GEHC_WATCHDOG] Falha ao reagendar:', err.message);
    }
  }

  // Se algum tenant esta MORTO (6h+ sem snapshot), delega pra funcao
  // existente criar/manter o alerta ALTA. Ela ja cuida de notificar
  // Telegram e de re-notificar a cada 24h se persistir.
  // Tenants so 'lento' (3-6h) ainda nao viram alerta — da chance pro
  // auto-recovery funcionar antes de incomodar o operador.
  if (tenantsMortos > 0) {
    for (const tenant of tenantsComGehc) {
      await verificarMonitoramentoParado(tenant.id).catch((err) =>
        console.warn(`[GEHC_WATCHDOG] verificarMonitoramentoParado(${tenant.id}) falhou:`, err.message)
      );
    }
  }

  return {
    ok: true,
    acao: tenantsMortos > 0 ? 'alertou_e_tentou_recovery' : 'auto_recovery_silencioso',
    acaoReagendamento,
    tenantsMortos,
    resultados,
  };
}
