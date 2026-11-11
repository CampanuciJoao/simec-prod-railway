// Regras de alerta Solar genericas. Processa cada snapshot e decide:
//   - Abrir/fechar SolarOutage (so plantas com bateria)
//   - Emitir alertas MEDIA/ALTA conforme SoC
//   - Resolver alertas quando a condicao volta ao normal
//
// Plantas so de geracao (sem bateria): este modulo nao faz nada (o
// monitoramento de "gerou pouco hoje" vem de outro cron diario,
// nao do poll 60s).

import prisma from '../prismaService.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';

const RUNNING_STATE_OFFGRID = 164;  // convencao FoxESS; outros adapters normalizam p/ 164 se off-grid
const QUEDA_CONFIRMA_MS     = 2 * 60 * 1000;
const SOC_ALERTA_ALTA       = 35;
const SOC_ALERTA_CRITICA    = 15;

function aid(tenantId, plantId, label) {
  return buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, plantId, label);
}

async function infoPlanta(inverter) {
  const plant = await prisma.solarPlant.findFirst({
    where: { id: inverter.plantId, tenantId: inverter.tenantId },
    include: { unidade: { select: { nomeSistema: true } } },
  });
  return {
    plantId: inverter.plantId,
    plantNome: plant?.nome || 'Planta Solar',
    unidadeNome: plant?.unidade?.nomeSistema || plant?.nome || 'Unidade',
    temBateria: plant?.temBateria || false,
  };
}

// Deep-link padrao de alerta solar — abre a aba Energia do monitoramento
// ja com a planta correta selecionada.
export function linkMonitoramentoSolar(plantId) {
  return plantId
    ? `/monitoramento?tab=energia&plantId=${plantId}`
    : '/monitoramento?tab=energia';
}

async function upsertAlerta({ tenantId, id, titulo, subtitulo, prioridade, tipoEvento, link }) {
  const existente = await prisma.alerta.findUnique({
    where: { tenantId_id: { tenantId, id } },
    select: { id: true, subtitulo: true, prioridade: true, link: true },
  });

  if (existente) {
    const linkMudou = link && existente.link !== link;
    if (existente.subtitulo === subtitulo && existente.prioridade === prioridade && !linkMudou) {
      return 'inalterado';
    }
    const patch = { subtitulo, data: new Date() };
    if (existente.prioridade !== prioridade) {
      patch.prioridade = prioridade;
      patch.telegramEnviadoEm = null; // escalonamento re-notifica imediato
    }
    if (linkMudou) patch.link = link;
    await prisma.alerta.update({ where: { tenantId_id: { tenantId, id } }, data: patch });
    return 'atualizado';
  }

  await prisma.alerta.create({
    data: {
      id, tenantId, titulo, subtitulo, data: new Date(),
      prioridade,
      tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoEvento,
      link: link || null,
    },
  });
  return 'criado';
}

async function resolverAlerta(tenantId, id) {
  const { count } = await prisma.alerta.deleteMany({ where: { tenantId, id } });
  return count;
}

export async function processarEventosSolar({ inverter, snapshot }) {
  const plant = await infoPlanta(inverter);
  if (!plant.temBateria) {
    // Planta so de geracao — sem logica de queda. Futuro: alertas de
    // geracao abaixo do esperado, mas isso vai em cron diario separado.
    return;
  }

  const tenantId = inverter.tenantId;
  const plantId = plant.plantId;
  const soc = typeof snapshot.soc === 'number' ? snapshot.soc : null;
  const estaOffGrid = snapshot.runningState === RUNNING_STATE_OFFGRID;
  let houveMudanca = false;

  if (estaOffGrid) {
    const quedaAberta = await prisma.solarOutage.findFirst({
      where: { tenantId, plantId, fimEm: null },
      orderBy: { inicioEm: 'desc' },
    });

    if (!quedaAberta) {
      // Precisa 2min+ consecutivos off-grid pra confirmar queda (filtra flicker)
      const limiteConfirmacao = new Date(Date.now() - QUEDA_CONFIRMA_MS);
      const snapshotAnterior = await prisma.solarSnapshot.findFirst({
        where: {
          tenantId, plantId,
          id: { not: snapshot.id },
          runningState: RUNNING_STATE_OFFGRID,
          capturedAt: { lte: limiteConfirmacao },
        },
        orderBy: { capturedAt: 'desc' },
      });
      if (snapshotAnterior) {
        await prisma.solarOutage.create({
          data: {
            tenantId, plantId,
            inicioEm: snapshotAnterior.capturedAt,
            socInicial: snapshotAnterior.soc ?? soc,
            socMinimo: soc,
          },
        });
        await upsertAlerta({
          tenantId,
          id: aid(tenantId, plantId, 'queda-energia'),
          titulo: `Queda de energia em ${plant.unidadeNome}`,
          subtitulo: `${plant.plantNome} em bateria. SoC atual ${soc != null ? soc.toFixed(0) + '%' : 'desconhecido'}.`,
          prioridade: ALERT_PRIORIDADES.MEDIA,
          tipoEvento: ALERT_EVENTOS.FOXESS_QUEDA_ENERGIA,
          link: linkMonitoramentoSolar(plantId),
        });
        houveMudanca = true;
      }
    } else {
      if (soc != null && (quedaAberta.socMinimo == null || soc < quedaAberta.socMinimo)) {
        await prisma.solarOutage.update({
          where: { id: quedaAberta.id },
          data: { socMinimo: soc },
        });
      }
      const minsEmQueda = Math.round((Date.now() - quedaAberta.inicioEm.getTime()) / 60000);
      await upsertAlerta({
        tenantId,
        id: aid(tenantId, plantId, 'queda-energia'),
        titulo: `Queda de energia em ${plant.unidadeNome}`,
        subtitulo: `${plant.plantNome} em bateria ha ${minsEmQueda}min. SoC ${soc != null ? soc.toFixed(0) + '%' : '?'}.`,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        tipoEvento: ALERT_EVENTOS.FOXESS_QUEDA_ENERGIA,
        link: linkMonitoramentoSolar(plantId),
      });

      if (soc != null) {
        if (soc <= SOC_ALERTA_CRITICA) {
          await upsertAlerta({
            tenantId,
            id: aid(tenantId, plantId, 'soc-critico'),
            titulo: `CRITICO: bateria em ${soc.toFixed(0)}% - ${plant.unidadeNome}`,
            subtitulo: `${plant.plantNome}: risco de desligamento em breve.`,
            prioridade: ALERT_PRIORIDADES.ALTA,
            tipoEvento: ALERT_EVENTOS.FOXESS_SOC_CRITICO,
            link: linkMonitoramentoSolar(plantId),
          });
          houveMudanca = true;
        } else if (soc <= SOC_ALERTA_ALTA) {
          await upsertAlerta({
            tenantId,
            id: aid(tenantId, plantId, 'soc-baixo'),
            titulo: `Bateria em ${soc.toFixed(0)}% - ${plant.unidadeNome}`,
            subtitulo: `${plant.plantNome}: autonomia reduzida.`,
            prioridade: ALERT_PRIORIDADES.ALTA,
            tipoEvento: ALERT_EVENTOS.FOXESS_SOC_BAIXO,
            link: linkMonitoramentoSolar(plantId),
          });
          houveMudanca = true;
        }
      }
    }
  } else {
    const quedaAberta = await prisma.solarOutage.findFirst({
      where: { tenantId, plantId, fimEm: null },
      orderBy: { inicioEm: 'desc' },
    });
    if (quedaAberta) {
      const fim = new Date();
      const duracaoMin = Math.max(1, Math.round((fim.getTime() - quedaAberta.inicioEm.getTime()) / 60000));
      const resumo =
        `Energia restabelecida em ${plant.unidadeNome}. ` +
        `${plant.plantNome}: queda durou ${duracaoMin}min. ` +
        `SoC: ${quedaAberta.socInicial?.toFixed(0) ?? '?'}% -> ${soc?.toFixed(0) ?? '?'}% ` +
        `(minimo ${quedaAberta.socMinimo?.toFixed(0) ?? '?'}%).`;

      await prisma.solarOutage.update({
        where: { id: quedaAberta.id },
        data: { fimEm: fim, duracaoMin, socFinal: soc, resumo },
      });

      await upsertAlerta({
        tenantId,
        id: aid(tenantId, plantId, 'restabelecida'),
        titulo: `Energia restabelecida em ${plant.unidadeNome}`,
        subtitulo: resumo,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        tipoEvento: ALERT_EVENTOS.FOXESS_ENERGIA_RESTABELECIDA,
        link: linkMonitoramentoSolar(plantId),
      });
      houveMudanca = true;
    }

    await resolverAlerta(tenantId, aid(tenantId, plantId, 'queda-energia'));
    await resolverAlerta(tenantId, aid(tenantId, plantId, 'soc-baixo'));
    await resolverAlerta(tenantId, aid(tenantId, plantId, 'soc-critico'));
  }

  if (houveMudanca) {
    await publicarContagemAlertasParaTenant({ tenantId }).catch(() => {});
  }
}
