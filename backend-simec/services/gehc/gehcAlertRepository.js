import prisma from '../prismaService.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';

const THRESHOLDS = {
  heliumWarn:     70,
  heliumCritical: 30,
  tempWarn:       18,
  tempCritical:   25,
  flowMin:        1.5,
  pressureMin:    0.8,
  pressureMax:    1.5,
  pressureCriticalMax: 2.0,
};

function regrasDeAlerta(snapshot, equipamentoNome) {
  const alertas = [];
  const { heliumLevelPct, heliumPressurePsi, compressorStatus,
          coolantTempC, coolantFlowGpm, magnetOnline } = snapshot;

  if (heliumLevelPct !== null) {
    if (heliumLevelPct < THRESHOLDS.heliumCritical) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_HELIO_CRITICO,
        prioridade: ALERT_PRIORIDADES.ALTA,
        titulo: `Nível de hélio crítico — ${equipamentoNome}`,
        subtitulo: `Nível atual: ${heliumLevelPct}% — risco iminente de quench`,
        label: 'helio-critico',
      });
    } else if (heliumLevelPct < THRESHOLDS.heliumWarn) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_HELIO_BAIXO,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        titulo: `Nível de hélio baixo — ${equipamentoNome}`,
        subtitulo: `Nível atual: ${heliumLevelPct}% (recomendado: acima de ${THRESHOLDS.heliumWarn}%)`,
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

  if (coolantTempC !== null) {
    if (coolantTempC > THRESHOLDS.tempCritical) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_TEMPERATURA_ALTA,
        prioridade: ALERT_PRIORIDADES.ALTA,
        titulo: `Temperatura do resfriador crítica — ${equipamentoNome}`,
        subtitulo: `Temperatura atual: ${coolantTempC}°C (limite crítico: ${THRESHOLDS.tempCritical}°C)`,
        label: 'temp-critica',
      });
    } else if (coolantTempC > THRESHOLDS.tempWarn) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_TEMPERATURA_ALTA,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        titulo: `Temperatura do resfriador elevada — ${equipamentoNome}`,
        subtitulo: `Temperatura atual: ${coolantTempC}°C (recomendado: abaixo de ${THRESHOLDS.tempWarn}°C)`,
        label: 'temp-alta',
      });
    }
  }

  if (coolantFlowGpm !== null && coolantFlowGpm < THRESHOLDS.flowMin) {
    alertas.push({
      evento: ALERT_EVENTOS.GEHC_FLUXO_BAIXO,
      prioridade: ALERT_PRIORIDADES.MEDIA,
      titulo: `Fluxo do resfriador abaixo do normal — ${equipamentoNome}`,
      subtitulo: `Fluxo atual: ${coolantFlowGpm} GPM (mínimo: ${THRESHOLDS.flowMin} GPM)`,
      label: 'fluxo-baixo',
    });
  }

  if (heliumPressurePsi !== null) {
    if (heliumPressurePsi > THRESHOLDS.pressureCriticalMax || heliumPressurePsi < THRESHOLDS.pressureMin) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_PRESSAO_ANORMAL,
        prioridade: ALERT_PRIORIDADES.ALTA,
        titulo: `Pressão do hélio crítica — ${equipamentoNome}`,
        subtitulo: `Pressão atual: ${heliumPressurePsi} PSI (faixa segura: ${THRESHOLDS.pressureMin}–${THRESHOLDS.pressureCriticalMax} PSI).`,
        label: 'pressao-critica',
      });
    } else if (heliumPressurePsi > THRESHOLDS.pressureMax) {
      alertas.push({
        evento: ALERT_EVENTOS.GEHC_PRESSAO_ANORMAL,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        titulo: `Pressão do hélio elevada — ${equipamentoNome}`,
        subtitulo: `Pressão atual: ${heliumPressurePsi} PSI (recomendado: até ${THRESHOLDS.pressureMax} PSI).`,
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

export async function processarAlertasGehc({ tenantId, equipamentoId, equipamentoNome, snapshot }) {
  const regras = regrasDeAlerta(snapshot, equipamentoNome);
  let criados = 0;

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
    }
  }

  if (criados > 0) {
    await publicarContagemAlertasParaTenant({ tenantId });
  }

  return { criados, total: regras.length };
}
