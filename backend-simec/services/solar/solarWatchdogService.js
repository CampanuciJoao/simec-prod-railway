// Watchdog Solar — mesmo padrao do watchdog FoxESS/GEHC. Independente
// dos crons solar-poll. Detecta quando a coleta para e tenta recuperar
// sozinho antes de alertar.
//
// 3 niveis (Fase 2 — threshold curto configuravel):
//   - 1h sem snapshot: alerta MEDIA + Telegram (SOLAR_OFFLINE_CURTO)
//   - 90min-3h sem snapshot: reagenda silencioso (cooldown 1h)
//   - 3h+ sem snapshot: reagenda + alerta ALTA + Telegram (FOXESS_MONITORAMENTO_PARADO)
//
// O limiar curto (1h) e configuravel por planta via
// SolarPlant.alertaOfflineMinutos (default DEFAULT_OFFLINE_CURTO_MIN).

import prisma from '../prismaService.js';
import { reagendarJobsSolar } from '../queueService.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';

const DEFAULT_OFFLINE_CURTO_MIN = 60;
const WATCHDOG_LENTO_MS       = 90 * 60 * 1000;
const WATCHDOG_MORTO_MS       = 3  * 60 * 60 * 1000;
const COOLDOWN_RECOVERY_MS    = 60 * 60 * 1000;
const REDIS_KEY_LAST_RECOVERY = 'watchdog:solar:last_recovery';
const REDIS_TTL_SECONDS       = 24 * 60 * 60;

async function getUltimaTentativa(redis) {
  if (!redis) return null;
  try { const v = await redis.get(REDIS_KEY_LAST_RECOVERY); return v ? Number(v) : null; }
  catch { return null; }
}

async function marcarTentativa(redis) {
  if (!redis) return;
  try { await redis.set(REDIS_KEY_LAST_RECOVERY, String(Date.now()), 'EX', REDIS_TTL_SECONDS); }
  catch { /* ignore */ }
}

function classificar(idadeMs) {
  if (idadeMs < WATCHDOG_LENTO_MS) return 'ok';
  if (idadeMs < WATCHDOG_MORTO_MS) return 'lento';
  return 'morto';
}

// Alerta MEDIA quando passa do threshold curto configuravel (default 1h).
// Independente do alerta ALTA de 3h+ — podem coexistir.
async function verificarOfflineCurto(plant) {
  const alertaId = buildAlertId(plant.tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, plant.id, 'offline-curto');
  const limiteMin = plant.alertaOfflineMinutos ?? DEFAULT_OFFLINE_CURTO_MIN;
  const limiteMs = limiteMin * 60 * 1000;
  const ultimo = await prisma.solarSnapshot.findFirst({
    where: { tenantId: plant.tenantId, plantId: plant.id },
    orderBy: { capturedAt: 'desc' },
    select: { capturedAt: true },
  });
  const idadeMs = ultimo ? Date.now() - ultimo.capturedAt.getTime() : Infinity;

  // Nao atingiu o threshold curto, ou ja passou do morto (vai cair no alerta ALTA)
  if (idadeMs < limiteMs || idadeMs >= WATCHDOG_MORTO_MS) {
    const { count } = await prisma.alerta.deleteMany({
      where: { tenantId: plant.tenantId, id: alertaId },
    });
    if (count > 0) await publicarContagemAlertasParaTenant({ tenantId: plant.tenantId }).catch(() => {});
    return 'normalizado';
  }

  const minutos = Math.round(idadeMs / 60000);
  const subtitulo = `Planta ${plant.nome}: sem novos dados ha ~${minutos} min. Threshold configurado: ${limiteMin} min.`;

  const existente = await prisma.alerta.findUnique({
    where: { tenantId_id: { tenantId: plant.tenantId, id: alertaId } },
    select: { id: true, subtitulo: true },
  });
  if (existente?.subtitulo === subtitulo) return 'inalterado';
  if (existente) {
    await prisma.alerta.update({
      where: { tenantId_id: { tenantId: plant.tenantId, id: alertaId } },
      data: { subtitulo, data: new Date() },
    });
    return 'atualizado';
  }
  await prisma.alerta.create({
    data: {
      id: alertaId, tenantId: plant.tenantId,
      titulo: `Planta ${plant.nome}: offline ha mais de ${limiteMin} min`,
      subtitulo, data: new Date(),
      prioridade: ALERT_PRIORIDADES.MEDIA,
      tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoEvento: ALERT_EVENTOS.SOLAR_OFFLINE_CURTO,
    },
  });
  await publicarContagemAlertasParaTenant({ tenantId: plant.tenantId }).catch(() => {});
  return 'criado';
}

async function verificarEMarcarMonitoramentoParado(plant) {
  const alertaId = buildAlertId(plant.tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, plant.id, 'monitoramento-parado');
  const ultimoSnapshot = await prisma.solarSnapshot.findFirst({
    where: { tenantId: plant.tenantId, plantId: plant.id },
    orderBy: { capturedAt: 'desc' },
    select: { capturedAt: true },
  });
  const idadeMs = ultimoSnapshot ? Date.now() - ultimoSnapshot.capturedAt.getTime() : Infinity;
  const parado = idadeMs > WATCHDOG_MORTO_MS;

  if (!parado) {
    const { count } = await prisma.alerta.deleteMany({ where: { tenantId: plant.tenantId, id: alertaId } });
    if (count > 0) await publicarContagemAlertasParaTenant({ tenantId: plant.tenantId }).catch(() => {});
    return 'normalizado';
  }

  const horas = Math.round(idadeMs / 3600000);
  const subtitulo = ultimoSnapshot
    ? `Planta ${plant.nome}: sem novos dados ha ~${horas}h. Verificar credencial ou status do inversor.`
    : `Planta ${plant.nome}: nenhum snapshot capturado. Verificar credencial do inversor.`;

  const existente = await prisma.alerta.findUnique({
    where: { tenantId_id: { tenantId: plant.tenantId, id: alertaId } },
    select: { id: true, subtitulo: true },
  });
  if (existente?.subtitulo === subtitulo) return 'inalterado';

  if (existente) {
    await prisma.alerta.update({
      where: { tenantId_id: { tenantId: plant.tenantId, id: alertaId } },
      data: { subtitulo, data: new Date() },
    });
    return 'atualizado';
  }

  await prisma.alerta.create({
    data: {
      id: alertaId,
      tenantId: plant.tenantId,
      titulo: `Monitoramento Solar parado - ${plant.nome}`,
      subtitulo,
      data: new Date(),
      prioridade: ALERT_PRIORIDADES.ALTA,
      tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoEvento: ALERT_EVENTOS.FOXESS_MONITORAMENTO_PARADO,
    },
  });
  await publicarContagemAlertasParaTenant({ tenantId: plant.tenantId }).catch(() => {});
  return 'criado';
}

export async function watchdogSolar({ redisConnection } = {}) {
  const plants = await prisma.solarPlant.findMany({
    where: { ativo: true },
    select: { id: true, tenantId: true, nome: true, alertaOfflineMinutos: true },
  });
  if (plants.length === 0) return { ok: true, acao: 'sem_plantas', plants: [] };

  const resultados = [];
  let precisaReagendar = false;
  let plantsMortos = 0;

  for (const p of plants) {
    const ultimo = await prisma.solarSnapshot.findFirst({
      where: { tenantId: p.tenantId, plantId: p.id },
      orderBy: { capturedAt: 'desc' },
      select: { capturedAt: true },
    });
    const idadeMs = ultimo ? Date.now() - ultimo.capturedAt.getTime() : Infinity;
    const estado = classificar(idadeMs);
    resultados.push({ plantId: p.id, estado, minutosDesdeUltimoSnapshot: idadeMs === Infinity ? null : Math.round(idadeMs / 60000) });
    if (estado !== 'ok') precisaReagendar = true;
    if (estado === 'morto') plantsMortos++;
  }

  // Alerta curto (1h default, por planta) sempre roda — independente de
  // reagendamento. Permite notificar operacao em menos de 90min.
  for (const p of plants) {
    await verificarOfflineCurto(p).catch(() => {});
  }

  if (!precisaReagendar) {
    for (const p of plants) {
      await verificarEMarcarMonitoramentoParado(p).catch(() => {});
    }
    return { ok: true, acao: 'tudo_normal', resultados };
  }

  const ultimaTentativa = await getUltimaTentativa(redisConnection);
  const podeReagendar = !ultimaTentativa || (Date.now() - ultimaTentativa) >= COOLDOWN_RECOVERY_MS;

  let acaoReagendamento = 'cooldown';
  if (podeReagendar) {
    try {
      const r = await reagendarJobsSolar();
      await marcarTentativa(redisConnection);
      acaoReagendamento = r?.ok === false ? 'tentou_mas_falhou' : 'reagendou';
      console.log(`[SOLAR_WATCHDOG] Auto-recovery em ${resultados.length} planta(s). Resultado: ${acaoReagendamento}`);
    } catch (err) {
      acaoReagendamento = 'tentou_mas_falhou';
      console.error('[SOLAR_WATCHDOG] Falha reagendar:', err.message);
    }
  }

  if (plantsMortos > 0) {
    for (const p of plants) {
      await verificarEMarcarMonitoramentoParado(p).catch(() => {});
    }
  }

  return {
    ok: true,
    acao: plantsMortos > 0 ? 'alertou_e_tentou_recovery' : 'auto_recovery_silencioso',
    acaoReagendamento,
    plantsMortos,
    resultados,
  };
}
