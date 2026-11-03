// Watchdog FoxESS: mesmo padrao do watchdog GEHC. Vigia independente dos
// jobs 'foxess-poll' pra detectar quando a coleta para e, se possivel,
// tentar recuperar sozinho antes de criar alerta de monitoramento parado.
//
// 2 niveis de reacao (identicos ao GEHC):
//   - Lento (90min-3h sem snapshot): reagenda crons silenciosamente,
//     respeita cooldown de 1h entre tentativas (Redis)
//   - Morto (3h+ sem snapshot): reagenda + cria alerta ALTA +
//     notifica Telegram via mecanismo existente
//
// Thresholds menores que GEHC porque FoxESS poll e muito mais frequente
// (60s vs 2h). 90min sem snapshot aqui ja e sintoma claro.

import prisma from '../prismaService.js';
import { reagendarJobsFoxess } from '../queueService.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';

const WATCHDOG_LENTO_MS       = 90 * 60 * 1000;  // 90min
const WATCHDOG_MORTO_MS       = 3  * 60 * 60 * 1000;  // 3h
const COOLDOWN_RECOVERY_MS    = 60 * 60 * 1000;  // 1h entre tentativas
const REDIS_KEY_LAST_RECOVERY = 'watchdog:foxess:last_recovery';
const REDIS_TTL_SECONDS       = 24 * 60 * 60;

function nowMs() { return Date.now(); }

async function getUltimaTentativaRecovery(redisConnection) {
  if (!redisConnection) return null;
  try {
    const valor = await redisConnection.get(REDIS_KEY_LAST_RECOVERY);
    return valor ? Number(valor) : null;
  } catch (err) {
    console.warn('[FOXESS_WATCHDOG] Falha ao ler ultima tentativa:', err.message);
    return null;
  }
}

async function marcarTentativaRecovery(redisConnection) {
  if (!redisConnection) return;
  try {
    await redisConnection.set(REDIS_KEY_LAST_RECOVERY, String(nowMs()), 'EX', REDIS_TTL_SECONDS);
  } catch (err) {
    console.warn('[FOXESS_WATCHDOG] Falha ao marcar tentativa:', err.message);
  }
}

function classificar(idadeMs) {
  if (idadeMs < WATCHDOG_LENTO_MS) return 'ok';
  if (idadeMs < WATCHDOG_MORTO_MS) return 'lento';
  return 'morto';
}

async function verificarEMarcarMonitoramentoParado(site) {
  const alertaId = buildAlertId(site.tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, site.id, 'monitoramento-parado');
  const ultimoSnapshot = await prisma.foxessSnapshot.findFirst({
    where: { tenantId: site.tenantId, siteId: site.id },
    orderBy: { capturedAt: 'desc' },
    select: { capturedAt: true },
  });
  const idadeMs = ultimoSnapshot ? nowMs() - ultimoSnapshot.capturedAt.getTime() : Infinity;
  const parado = idadeMs > WATCHDOG_MORTO_MS;

  if (!parado) {
    const { count } = await prisma.alerta.deleteMany({
      where: { tenantId: site.tenantId, id: alertaId },
    });
    if (count > 0) {
      await publicarContagemAlertasParaTenant({ tenantId: site.tenantId }).catch(() => {});
    }
    return 'normalizado';
  }

  const horas = Math.round(idadeMs / 3600000);
  const subtitulo = ultimoSnapshot
    ? `Sem novos dados ha ~${horas}h. Verificar credencial FoxESS ou status do inversor.`
    : 'Nenhum snapshot capturado ainda. Verificar credencial FoxESS.';

  const existente = await prisma.alerta.findUnique({
    where: { tenantId_id: { tenantId: site.tenantId, id: alertaId } },
    select: { id: true, subtitulo: true },
  });

  if (existente?.subtitulo === subtitulo) return 'inalterado';

  if (existente) {
    await prisma.alerta.update({
      where: { tenantId_id: { tenantId: site.tenantId, id: alertaId } },
      data: { subtitulo, data: new Date() },
    });
    return 'atualizado';
  }

  await prisma.alerta.create({
    data: {
      id: alertaId,
      tenantId: site.tenantId,
      titulo: `Monitoramento FoxESS parado - ${site.nome}`,
      subtitulo,
      data: new Date(),
      prioridade: ALERT_PRIORIDADES.ALTA,
      tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoEvento: ALERT_EVENTOS.FOXESS_MONITORAMENTO_PARADO,
    },
  });
  await publicarContagemAlertasParaTenant({ tenantId: site.tenantId }).catch(() => {});
  return 'criado';
}

export async function watchdogFoxess({ redisConnection } = {}) {
  const sitesAtivos = await prisma.foxessSite.findMany({
    where: { ativo: true },
    select: { id: true, tenantId: true, nome: true },
  });

  if (sitesAtivos.length === 0) {
    return { ok: true, acao: 'sem_sites', sites: [] };
  }

  const resultados = [];
  let precisaReagendar = false;
  let sitesMortos = 0;

  for (const site of sitesAtivos) {
    const ultimoSnapshot = await prisma.foxessSnapshot.findFirst({
      where: { tenantId: site.tenantId, siteId: site.id },
      orderBy: { capturedAt: 'desc' },
      select: { capturedAt: true },
    });
    const idadeMs = ultimoSnapshot ? nowMs() - ultimoSnapshot.capturedAt.getTime() : Infinity;
    const estado = classificar(idadeMs);
    resultados.push({
      siteId: site.id,
      estado,
      minutosDesdeUltimoSnapshot: idadeMs === Infinity ? null : Math.round(idadeMs / 60000),
    });

    if (estado !== 'ok') precisaReagendar = true;
    if (estado === 'morto') sitesMortos++;
  }

  if (!precisaReagendar) {
    for (const site of sitesAtivos) {
      await verificarEMarcarMonitoramentoParado(site).catch((err) =>
        console.warn(`[FOXESS_WATCHDOG] verificar ${site.id}:`, err.message)
      );
    }
    return { ok: true, acao: 'tudo_normal', resultados };
  }

  const ultimaTentativa = await getUltimaTentativaRecovery(redisConnection);
  const podeReagendar = !ultimaTentativa || (nowMs() - ultimaTentativa) >= COOLDOWN_RECOVERY_MS;

  let acaoReagendamento = 'cooldown';
  if (podeReagendar) {
    try {
      const r = await reagendarJobsFoxess();
      await marcarTentativaRecovery(redisConnection);
      acaoReagendamento = r?.ok === false ? 'tentou_mas_falhou' : 'reagendou';
      console.log(`[FOXESS_WATCHDOG] Auto-recovery acionado em ${resultados.length} site(s). Resultado: ${acaoReagendamento}`);
    } catch (err) {
      acaoReagendamento = 'tentou_mas_falhou';
      console.error('[FOXESS_WATCHDOG] Falha ao reagendar:', err.message);
    }
  }

  // Sites MORTOS criam alerta ALTA (que notifica Telegram). Sites LENTO
  // ainda nao viram alerta — dao chance pro auto-recovery funcionar.
  if (sitesMortos > 0) {
    for (const site of sitesAtivos) {
      await verificarEMarcarMonitoramentoParado(site).catch((err) =>
        console.warn(`[FOXESS_WATCHDOG] verificar ${site.id}:`, err.message)
      );
    }
  }

  return {
    ok: true,
    acao: sitesMortos > 0 ? 'alertou_e_tentou_recovery' : 'auto_recovery_silencioso',
    acaoReagendamento,
    sitesMortos,
    resultados,
  };
}
