import prisma from '../prismaService.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';

export const THRESHOLDS = {
  heliumWarn:          70,
  heliumCritical:      30,
  tempWarn:            18,
  tempCritical:        25,
  flowMin:             1.5,
  pressureMin:         0.8,
  pressureMax:         1.5,
  pressureCriticalMax: 2.0,
};

// Labels agrupados por métrica: permite saber quais alertas resolver quando a condição normaliza
const LABELS_POR_METRICA = {
  heliumLevelPct:    ['helio-critico', 'helio-baixo'],
  compressorStatus:  ['compressor-off'],
  coolantTempC:      ['temp-critica', 'temp-alta'],
  coolantFlowGpm:    ['fluxo-baixo'],
  heliumPressurePsi: ['pressao-critica', 'pressao-alta'],
  magnetOnline:      ['magneto-offline'],
};

function regrasDeAlerta(snapshot, equipamentoNome) {
  const alertas = [];
  const { heliumLevelPct, heliumPressurePsi, compressorStatus,
          coolantTempC, coolantFlowGpm, magnetOnline } = snapshot;

  if (heliumLevelPct !== null && heliumLevelPct !== undefined) {
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

  if (coolantTempC !== null && coolantTempC !== undefined) {
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

  if (coolantFlowGpm !== null && coolantFlowGpm !== undefined && coolantFlowGpm < THRESHOLDS.flowMin) {
    alertas.push({
      evento: ALERT_EVENTOS.GEHC_FLUXO_BAIXO,
      prioridade: ALERT_PRIORIDADES.MEDIA,
      titulo: `Fluxo do resfriador abaixo do normal — ${equipamentoNome}`,
      subtitulo: `Fluxo atual: ${coolantFlowGpm} GPM (mínimo: ${THRESHOLDS.flowMin} GPM)`,
      label: 'fluxo-baixo',
    });
  }

  if (heliumPressurePsi !== null && heliumPressurePsi !== undefined) {
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

  // Computa regras e filtra eventos suspensos
  const todasRegras = regrasDeAlerta(snapshot, equipamentoNome);
  const regras = todasRegras.filter(r => !eventosSuspensos.has(r.evento));

  const labelsAtivos = new Set(regras.map(r => r.label));
  let mudouContagem = false;

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

  // Cria ou atualiza alertas ativos
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
      mudouContagem = true;
    }
  }

  if (mudouContagem) {
    await publicarContagemAlertasParaTenant({ tenantId });
  }

  return { criados, total: regras.length };
}
