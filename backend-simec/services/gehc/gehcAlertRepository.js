import prisma from '../prismaService.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';
import { DEFAULTS as ALERT_DEFAULTS, getConfig as getAlertConfig } from '../alertas/alertConfigService.js';

/**
 * THRESHOLDS legados — mantidos como **defaults estáticos** para
 * compatibilidade com qualquer importação direta. A fonte de verdade
 * é `DEFAULTS.GEHC` em alertConfigService. Quem precisa dos valores
 * efetivos por tenant deve chamar `getAlertConfig(tenantId, 'GEHC')`.
 */
export const THRESHOLDS = ALERT_DEFAULTS.GEHC;

// 72h: equipamentos GE ficam naturalmente offline em finais de semana
// (uso clinico interrompido). Alerta antes disso gera ruido. 72h cobre
// fim de semana inteiro + 1 dia util de margem antes de notificar.
const OFFLINE_THRESHOLD_MS = 72 * 60 * 60 * 1000; // 72 horas

// Labels agrupados por métrica: permite saber quais alertas resolver quando a condição normaliza
const LABELS_POR_METRICA = {
  heliumLevelPct:    ['helio-critico', 'helio-baixo'],
  compressorStatus:  ['compressor-off'],
  coolantTempC:      ['temp-critica', 'temp-alta'],
  coolantFlowGpm:    ['fluxo-baixo'],
  heliumPressurePsi: ['pressao-critica', 'pressao-alta'],
  magnetOnline:      ['magneto-offline'],
};

/**
 * Avalia o snapshot contra os thresholds e retorna a lista de alertas a criar.
 * @param {object} snapshot - leitura GE atual
 * @param {string} equipamentoNome
 * @param {boolean} eRessonancia
 * @param {object} [thresholds=THRESHOLDS] - configuração efetiva do tenant
 *   (defaults se não passado, para compatibilidade com chamadas legadas)
 */
function regrasDeAlerta(snapshot, equipamentoNome, eRessonancia = false, thresholds = THRESHOLDS) {
  const alertas = [];
  const { heliumLevelPct, heliumPressurePsi, compressorStatus,
          coolantTempC, coolantFlowGpm, magnetOnline } = snapshot;
  const t = thresholds || THRESHOLDS;

  // Alertas de hélio, magneto e cryo são exclusivos de ressonâncias magnéticas
  if (!eRessonancia) return alertas;

  if (heliumLevelPct !== null && heliumLevelPct !== undefined) {
    if (heliumLevelPct < t.heliumCritical) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_HELIO_CRITICO,
        prioridade: ALERT_PRIORIDADES.ALTA,
        titulo: `Nível de hélio crítico — ${equipamentoNome}`,
        subtitulo: `Nível atual: ${heliumLevelPct}% — risco iminente de quench`,
        label: 'helio-critico',
      });
    } else if (heliumLevelPct < t.heliumWarn) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_HELIO_BAIXO,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        titulo: `Nível de hélio baixo — ${equipamentoNome}`,
        subtitulo: `Nível atual: ${heliumLevelPct}% (recomendado: acima de ${t.heliumWarn}%)`,
        label: 'helio-baixo',
      });
    }
  }

  if (compressorStatus && compressorStatus !== 'ON') {
    alertas.push({
      evento: ALERT_EVENTOS.GEHC_COMPRESSOR_OFF,
      prioridade: ALERT_PRIORIDADES.ALTA,
      titulo: `Compressor desligado — ${equipamentoNome}`,
      subtitulo: `Status atual: ${compressorStatus}. Verifique imediatamente.`,
      label: 'compressor-off',
    });
  }

  if (coolantTempC !== null && coolantTempC !== undefined) {
    if (coolantTempC > t.tempCritical) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_TEMPERATURA_ALTA,
        prioridade: ALERT_PRIORIDADES.ALTA,
        titulo: `Temperatura do resfriador crítica — ${equipamentoNome}`,
        subtitulo: `Temperatura atual: ${coolantTempC}°C (limite crítico: ${t.tempCritical}°C)`,
        label: 'temp-critica',
      });
    } else if (coolantTempC > t.tempWarn) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_TEMPERATURA_ALTA,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        titulo: `Temperatura do resfriador elevada — ${equipamentoNome}`,
        subtitulo: `Temperatura atual: ${coolantTempC}°C (recomendado: abaixo de ${t.tempWarn}°C)`,
        label: 'temp-alta',
      });
    }
  }

  if (coolantFlowGpm !== null && coolantFlowGpm !== undefined && coolantFlowGpm < t.flowMin) {
    alertas.push({
      evento: ALERT_EVENTOS.GEHC_FLUXO_BAIXO,
      prioridade: ALERT_PRIORIDADES.MEDIA,
      titulo: `Fluxo do resfriador abaixo do normal — ${equipamentoNome}`,
      subtitulo: `Fluxo atual: ${coolantFlowGpm} GPM (mínimo: ${t.flowMin} GPM)`,
      label: 'fluxo-baixo',
    });
  }

  if (heliumPressurePsi !== null && heliumPressurePsi !== undefined) {
    if (heliumPressurePsi > t.pressureCriticalMax || heliumPressurePsi < t.pressureMin) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_PRESSAO_ANORMAL,
        prioridade: ALERT_PRIORIDADES.ALTA,
        titulo: `Pressão do hélio crítica — ${equipamentoNome}`,
        subtitulo: `Pressão atual: ${heliumPressurePsi} PSI (faixa segura: ${t.pressureMin}–${t.pressureCriticalMax} PSI).`,
        label: 'pressao-critica',
      });
    } else if (heliumPressurePsi > t.pressureMax) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_PRESSAO_ANORMAL,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        titulo: `Pressão do hélio elevada — ${equipamentoNome}`,
        subtitulo: `Pressão atual: ${heliumPressurePsi} PSI (recomendado: até ${t.pressureMax} PSI).`,
        label: 'pressao-alta',
      });
    }
  }

  if (magnetOnline === false) {
    alertas.push({
      evento: ALERT_EVENTOS.GEHC_MAGNETO_OFFLINE,
      prioridade: ALERT_PRIORIDADES.ALTA,
      titulo: `Magneto offline — ${equipamentoNome}`,
      subtitulo: 'O magneto está sem conexão com o sistema GE InSite.',
      label: 'magneto-offline',
    });
  }

  return alertas;
}

async function verificarOfflineProlongado(tenantId, equipamentoId, agora) {
  // Encontra o snapshot online mais recente para calcular quanto tempo está offline
  const ultimoOnline = await prisma.gehcSaudeSnapshot.findFirst({
    where: { tenantId, equipamentoId, equipmentOnline: true },
    orderBy: { capturedAt: 'desc' },
    select: { capturedAt: true },
  });

  if (ultimoOnline) {
    return agora - ultimoOnline.capturedAt >= OFFLINE_THRESHOLD_MS;
  }

  // Nunca esteve online — conta a partir do primeiro snapshot registrado
  const primeiroSnapshot = await prisma.gehcSaudeSnapshot.findFirst({
    where: { tenantId, equipamentoId },
    orderBy: { capturedAt: 'asc' },
    select: { capturedAt: true },
  });

  if (!primeiroSnapshot) return false;
  return agora - primeiroSnapshot.capturedAt >= OFFLINE_THRESHOLD_MS;
}

export async function processarAlertasGehc({ tenantId, equipamentoId, equipamentoNome, snapshot, eRessonancia = false }) {
  // Verifica suspensões ativas para este equipamento/tenant
  const now = new Date();
  const suspensoes = await prisma.gehcAlertaSuspensao.findMany({
    where: {
      tenantId,
      suspensoAte: { gt: now },
      OR: [
        { equipamentoId: null },
        { equipamentoId },
      ],
    },
    select: { equipamentoId: true, tipoEvento: true },
  });

  // Suspensão global do equipamento (ou de todos os equipamentos do tenant)
  const suspensoTudo = suspensoes.some(s => s.tipoEvento === null);
  if (suspensoTudo) {
    console.log(`[GEHC_ALERT] Alertas suspensos para ${equipamentoNome} — pulando processamento.`);
    return { criados: 0, total: 0, suspenso: true };
  }

  const eventosSuspensos = new Set(
    suspensoes.filter(s => s.tipoEvento !== null).map(s => s.tipoEvento)
  );

  // Carrega thresholds efetivos do tenant (com fallback para defaults)
  let thresholds = THRESHOLDS;
  try {
    const cfg = await getAlertConfig(tenantId, 'GEHC');
    if (cfg) {
      const { __meta, ...clean } = cfg;
      thresholds = clean;
    }
  } catch (err) {
    console.warn('[GEHC_ALERT] Falha ao carregar thresholds, usando defaults:', err.message);
  }

  // Computa regras e filtra eventos suspensos
  const todasRegras = regrasDeAlerta(snapshot, equipamentoNome, eRessonancia, thresholds);
  const regras = todasRegras.filter(r => !eventosSuspensos.has(r.evento));

  const labelsAtivos = new Set(regras.map(r => r.label));
  let mudouContagem = false;
  let criados = 0;

  // Detecção de normalização do compressor: verifica ANTES da auto-resolução apagar o alerta
  const { compressorStatus } = snapshot;
  const compressorOffId   = buildAlertId(tenantId, ALERT_CATEGORIAS.GEHC_SAUDE, equipamentoId, 'compressor-off');
  const compressorNormId  = buildAlertId(tenantId, ALERT_CATEGORIAS.GEHC_SAUDE, equipamentoId, 'compressor-normalizado');
  let compressorNormalizou = false;
  if (eRessonancia && compressorStatus === 'ON') {
    const alertaOff = await prisma.alerta.findUnique({
      where: { tenantId_id: { tenantId, id: compressorOffId } },
      select: { id: true },
    });
    compressorNormalizou = !!alertaOff;
  }

  // Auto-resolução: remove alertas cujas condições normalizaram (métrica tem dado mas não atingiu threshold)
  const idsParaResolver = [];
  for (const [metrica, labels] of Object.entries(LABELS_POR_METRICA)) {
    const valor = snapshot[metrica];
    if (valor !== null && valor !== undefined) {
      for (const label of labels) {
        if (!labelsAtivos.has(label)) {
          idsParaResolver.push(buildAlertId(tenantId, ALERT_CATEGORIAS.GEHC_SAUDE, equipamentoId, label));
        }
      }
    }
  }

  if (idsParaResolver.length > 0) {
    const { count } = await prisma.alerta.deleteMany({
      where: { tenantId, id: { in: idsParaResolver } },
    });
    if (count > 0) {
      mudouContagem = true;
      console.log(`[GEHC_ALERT] ${equipamentoNome}: ${count} alerta(s) resolvido(s) automaticamente.`);
    }
  }

  // Normalização do compressor (transição OFF→ON)
  if (eRessonancia && compressorStatus !== null && compressorStatus !== undefined) {
    if (compressorNormalizou) {
      const jaExiste = await prisma.alerta.findUnique({
        where: { tenantId_id: { tenantId, id: compressorNormId } },
        select: { id: true },
      });
      if (!jaExiste) {
        await prisma.alerta.create({
          data: {
            id: compressorNormId,
            tenantId,
            titulo: `Compressor normalizado — ${equipamentoNome}`,
            subtitulo: 'O compressor voltou a operar normalmente.',
            data: new Date(),
            prioridade: ALERT_PRIORIDADES.BAIXA,
            tipo: ALERT_CATEGORIAS.GEHC_SAUDE,
            tipoCategoria: ALERT_CATEGORIAS.GEHC_SAUDE,
            tipoEvento: ALERT_EVENTOS.GEHC_COMPRESSOR_ON,
          },
        });
        criados++;
        mudouContagem = true;
        console.log(`[GEHC_ALERT] ${equipamentoNome}: alerta de normalização do compressor criado.`);
      }
    } else if (compressorStatus !== 'ON') {
      // Compressor voltou a ficar offline — remove alerta de normalização
      const { count } = await prisma.alerta.deleteMany({ where: { tenantId, id: compressorNormId } });
      if (count > 0) {
        mudouContagem = true;
        console.log(`[GEHC_ALERT] ${equipamentoNome}: alerta de normalização do compressor removido.`);
      }
    }
  }

  // Alerta de equipamento offline prolongado (>72h — cobre finais de semana)
  const alertaOfflineId = buildAlertId(tenantId, ALERT_CATEGORIAS.GEHC_SAUDE, equipamentoId, 'equipamento-offline');
  if (snapshot.equipmentOnline === true) {
    const { count } = await prisma.alerta.deleteMany({
      where: { tenantId, id: alertaOfflineId },
    });
    if (count > 0) {
      mudouContagem = true;
      console.log(`[GEHC_ALERT] ${equipamentoNome}: alerta offline resolvido — equipamento voltou online.`);
    }
  } else if (eRessonancia && snapshot.equipmentOnline === false && !eventosSuspensos.has(ALERT_EVENTOS.GEHC_EQUIPAMENTO_OFFLINE)) {
    const agora = new Date();
    const offlineProlongado = await verificarOfflineProlongado(tenantId, equipamentoId, agora);
    if (offlineProlongado) {
      const existente = await prisma.alerta.findUnique({
        where: { tenantId_id: { tenantId, id: alertaOfflineId } },
        select: { id: true },
      });
      if (!existente) {
        await prisma.alerta.create({
          data: {
            id: alertaOfflineId,
            tenantId,
            titulo: `Equipamento offline há mais de 72h — ${equipamentoNome}`,
            subtitulo: 'Verifique a conectividade com o portal GE Healthcare. Janela de 72h cobre finais de semana e feriados — alerta indica problema persistente.',
            data: agora,
            prioridade: ALERT_PRIORIDADES.ALTA,
            tipo: ALERT_CATEGORIAS.GEHC_SAUDE,
            tipoCategoria: ALERT_CATEGORIAS.GEHC_SAUDE,
            tipoEvento: ALERT_EVENTOS.GEHC_EQUIPAMENTO_OFFLINE,
          },
        });
        criados++;
        mudouContagem = true;
        console.log(`[GEHC_ALERT] ${equipamentoNome}: alerta offline prolongado criado.`);
      }
    }
  }

  // Cria ou atualiza alertas ativos
  for (const regra of regras) {
    const alertaId = buildAlertId(tenantId, ALERT_CATEGORIAS.GEHC_SAUDE, equipamentoId, regra.label);

    const existente = await prisma.alerta.findUnique({
      where: { tenantId_id: { tenantId, id: alertaId } },
      select: { id: true, subtitulo: true },
    });

    if (existente?.subtitulo === regra.subtitulo) continue;

    if (existente) {
      await prisma.alerta.update({
        where: { tenantId_id: { tenantId, id: alertaId } },
        data: { subtitulo: regra.subtitulo, data: new Date() },
      });
    } else {
      await prisma.alerta.create({
        data: {
          id: alertaId,
          tenantId,
          titulo: regra.titulo,
          subtitulo: regra.subtitulo,
          data: new Date(),
          prioridade: regra.prioridade,
          tipo: ALERT_CATEGORIAS.GEHC_SAUDE,
          tipoCategoria: ALERT_CATEGORIAS.GEHC_SAUDE,
          tipoEvento: regra.evento,
        },
      });
      criados++;
      mudouContagem = true;
    }
  }

  if (mudouContagem) {
    await publicarContagemAlertasParaTenant({ tenantId });
  }

  return { criados, total: regras.length, mudouContagem };
}

// Threshold para considerar que o monitoramento GE parou. 2h cobre ciclos
// normais (30min cada) com folga e ainda aciona antes que um dia inteiro
// passe em silencio como no incidente 2026-05-10.
const STALE_MONITORING_MS = 2 * 60 * 60 * 1000;

// Verifica se o tenant tem equipamentos GE vinculados sem snapshot recente.
// Cria/remove alerta GEHC_MONITORAMENTO_PARADO conforme o estado.
//
// Chamado uma vez por ciclo do monitor (ver gehcMonitor.js). E idempotente:
// roda quantas vezes for, sem duplicar alertas.
export async function verificarMonitoramentoParado(tenantId) {
  const equipamentosVinculados = await prisma.equipamento.count({
    where: { tenantId, gehcAssetId: { not: null } },
  });

  // Sem equipamentos vinculados nao faz sentido alertar sobre monitoramento.
  if (equipamentosVinculados === 0) return { acao: 'sem_equipamentos' };

  const ultimoSnapshot = await prisma.gehcSaudeSnapshot.findFirst({
    where: { tenantId },
    orderBy: { capturedAt: 'desc' },
    select: { capturedAt: true },
  });

  const alertaId = buildAlertId(tenantId, ALERT_CATEGORIAS.GEHC_SAUDE, 'integracao', 'monitoramento-parado');
  const agora = Date.now();
  const idadeUltimoMs = ultimoSnapshot ? agora - ultimoSnapshot.capturedAt.getTime() : Infinity;
  const parado = idadeUltimoMs > STALE_MONITORING_MS;

  if (!parado) {
    // Voltou a sincronizar: remove alerta se existir.
    const { count } = await prisma.alerta.deleteMany({
      where: { tenantId, id: alertaId },
    });
    if (count > 0) {
      await publicarContagemAlertasParaTenant({ tenantId });
      console.log(`[GEHC_ALERT] Monitoramento normalizado para tenant ${tenantId}.`);
    }
    return { acao: 'normalizado', removidos: count };
  }

  // Esta parado: upsert do alerta.
  const horas = Math.round(idadeUltimoMs / 3600000);
  const subtitulo = ultimoSnapshot
    ? `Sem novos dados ha aproximadamente ${horas}h. Reautentique em Gerenciamento -> Integracoes.`
    : 'Nenhum snapshot foi capturado ainda. Verifique a autenticacao em Gerenciamento -> Integracoes.';

  const existente = await prisma.alerta.findUnique({
    where: { tenantId_id: { tenantId, id: alertaId } },
    select: { id: true, subtitulo: true },
  });

  if (existente?.subtitulo === subtitulo) {
    return { acao: 'inalterado' };
  }

  if (existente) {
    await prisma.alerta.update({
      where: { tenantId_id: { tenantId, id: alertaId } },
      data: { subtitulo, data: new Date() },
    });
    return { acao: 'atualizado' };
  }

  await prisma.alerta.create({
    data: {
      id: alertaId,
      tenantId,
      titulo: 'Monitoramento GE sem atualizacao',
      subtitulo,
      data: new Date(),
      prioridade: ALERT_PRIORIDADES.ALTA,
      tipo: ALERT_CATEGORIAS.GEHC_SAUDE,
      tipoCategoria: ALERT_CATEGORIAS.GEHC_SAUDE,
      tipoEvento: ALERT_EVENTOS.GEHC_MONITORAMENTO_PARADO,
      link: '/gerenciamento/integracoes',
    },
  });
  await publicarContagemAlertasParaTenant({ tenantId });
  console.log(`[GEHC_ALERT] Alerta de monitoramento parado criado para tenant ${tenantId} (${horas}h sem snapshot).`);
  return { acao: 'criado', idadeHoras: horas };
}
