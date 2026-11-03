// Regras de alerta FoxESS: processa cada snapshot e decide:
//   - Abrir uma FoxessQueda quando runningState=164 persiste por 2min+
//   - Fechar FoxessQueda quando runningState volta pra 163
//   - Emitir alertas MEDIA/ALTA/CRITICA conforme SoC durante a queda
//   - Re-notificacao via Telegram ja esta coberta pelo mecanismo
//     existente em telegramAlertService (re-envia a cada 24h se persiste)
//
// Thresholds (ajustaveis via constante no topo):
//   - QUEDA_CONFIRMA_MIN: 2min off-grid ate abrir queda (filtra flicker)
//   - SOC_ALERTA_ALTA: 35% (primeiro aviso de bateria baixa)
//   - SOC_ALERTA_CRITICA: 15% (ultimo aviso antes de desligar)
//
// IDs de alerta sao deterministicos (buildAlertId) pra garantir idempotencia:
// o mesmo evento gera upsert, nao duplica.

import prisma from '../prismaService.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';

const RUNNING_STATE_OFFGRID = 164;
const QUEDA_CONFIRMA_MS     = 2 * 60 * 1000;  // 2min off-grid consecutivo
const SOC_ALERTA_ALTA       = 35;
const SOC_ALERTA_CRITICA    = 15;

function alertaIdQueda(tenantId, siteId) {
  return buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, siteId, 'queda-energia');
}
function alertaIdSocBaixo(tenantId, siteId) {
  return buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, siteId, 'soc-baixo');
}
function alertaIdSocCritico(tenantId, siteId) {
  return buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, siteId, 'soc-critico');
}

async function nomeUnidade(site) {
  const u = await prisma.unidade.findFirst({
    where: { tenantId: site.tenantId, id: site.unidadeId },
    select: { nomeSistema: true },
  });
  return u?.nomeSistema || site.nome;
}

// Upsert idempotente de alerta FoxESS.
async function upsertAlerta({ tenantId, id, titulo, subtitulo, prioridade, tipoEvento }) {
  const existente = await prisma.alerta.findUnique({
    where: { tenantId_id: { tenantId, id } },
    select: { id: true, subtitulo: true, prioridade: true },
  });

  if (existente) {
    if (existente.subtitulo === subtitulo && existente.prioridade === prioridade) {
      return 'inalterado';
    }
    const dataPatch = { subtitulo, data: new Date() };
    // Escalonamento (ex: MEDIA -> ALTA) reseta telegramEnviadoEm pra
    // forcar nova notificacao no proximo drenagem do Telegram, igual GEHC.
    if (existente.prioridade !== prioridade) {
      dataPatch.prioridade = prioridade;
      dataPatch.telegramEnviadoEm = null;
    }
    await prisma.alerta.update({
      where: { tenantId_id: { tenantId, id } },
      data: dataPatch,
    });
    return 'atualizado';
  }

  await prisma.alerta.create({
    data: {
      id,
      tenantId,
      titulo,
      subtitulo,
      data: new Date(),
      prioridade,
      tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoEvento,
    },
  });
  return 'criado';
}

async function resolverAlerta(tenantId, id) {
  const { count } = await prisma.alerta.deleteMany({
    where: { tenantId, id },
  });
  return count;
}

// Nucleo da logica — chamado pelo poller depois de cada snapshot novo.
export async function processarEventosFoxess({ site, snapshot }) {
  const tenantId = site.tenantId;
  const siteId   = site.id;
  const soc      = typeof snapshot.soc === 'number' ? snapshot.soc : null;
  const estaOffGrid = snapshot.runningState === RUNNING_STATE_OFFGRID;

  const unidadeNome = await nomeUnidade(site);
  let houveMudanca = false;

  // ─── Deteccao de queda (abertura) ──────────────────────────────────────────
  // So abre quedaRecord quando esta off-grid HA pelo menos QUEDA_CONFIRMA_MS.
  // Isso evita abrir queda por flicker de rede de poucos segundos.
  if (estaOffGrid) {
    const quedaAberta = await prisma.foxessQueda.findFirst({
      where: { tenantId, siteId, fimEm: null },
      orderBy: { inicioEm: 'desc' },
    });

    if (!quedaAberta) {
      // Procura snapshot anterior em off-grid pra ver se ja passou 2min
      const limiteConfirmacao = new Date(Date.now() - QUEDA_CONFIRMA_MS);
      const snapshotAnteriorOffGrid = await prisma.foxessSnapshot.findFirst({
        where: {
          tenantId, siteId,
          id: { not: snapshot.id },
          runningState: RUNNING_STATE_OFFGRID,
          capturedAt: { lte: limiteConfirmacao },
        },
        orderBy: { capturedAt: 'desc' },
      });

      if (snapshotAnteriorOffGrid) {
        // Confirmado — abre queda
        await prisma.foxessQueda.create({
          data: {
            tenantId, siteId,
            inicioEm: snapshotAnteriorOffGrid.capturedAt,
            socInicial: snapshotAnteriorOffGrid.soc ?? soc,
            socMinimo: soc,
          },
        });
        await upsertAlerta({
          tenantId,
          id: alertaIdQueda(tenantId, siteId),
          titulo: `Queda de energia em ${unidadeNome}`,
          subtitulo: `Bateria assumiu. SoC atual ${soc != null ? soc.toFixed(0) + '%' : 'desconhecido'}. Monitorando.`,
          prioridade: ALERT_PRIORIDADES.MEDIA,
          tipoEvento: ALERT_EVENTOS.FOXESS_QUEDA_ENERGIA,
        });
        houveMudanca = true;
      }
    } else {
      // Queda em andamento — atualiza socMinimo se cair mais
      if (soc != null && (quedaAberta.socMinimo == null || soc < quedaAberta.socMinimo)) {
        await prisma.foxessQueda.update({
          where: { id: quedaAberta.id },
          data: { socMinimo: soc },
        });
      }

      // Mantem alerta de queda atualizado com SoC atual
      await upsertAlerta({
        tenantId,
        id: alertaIdQueda(tenantId, siteId),
        titulo: `Queda de energia em ${unidadeNome}`,
        subtitulo: `Em bateria ha ${Math.round((Date.now() - quedaAberta.inicioEm.getTime()) / 60000)}min. SoC atual ${soc != null ? soc.toFixed(0) + '%' : 'desconhecido'}.`,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        tipoEvento: ALERT_EVENTOS.FOXESS_QUEDA_ENERGIA,
      });

      // ─── Escalonamento por SoC durante queda ────────────────────────────
      if (soc != null) {
        if (soc <= SOC_ALERTA_CRITICA) {
          await upsertAlerta({
            tenantId,
            id: alertaIdSocCritico(tenantId, siteId),
            titulo: `CRITICO: bateria em ${soc.toFixed(0)}% - ${unidadeNome}`,
            subtitulo: `Risco de desligamento em breve. Acionar gerador ou carga reduzida.`,
            prioridade: ALERT_PRIORIDADES.ALTA,
            tipoEvento: ALERT_EVENTOS.FOXESS_SOC_CRITICO,
          });
          houveMudanca = true;
        } else if (soc <= SOC_ALERTA_ALTA) {
          await upsertAlerta({
            tenantId,
            id: alertaIdSocBaixo(tenantId, siteId),
            titulo: `Bateria em ${soc.toFixed(0)}% - ${unidadeNome}`,
            subtitulo: `Autonomia reduzida. Preparar contingencia.`,
            prioridade: ALERT_PRIORIDADES.ALTA,
            tipoEvento: ALERT_EVENTOS.FOXESS_SOC_BAIXO,
          });
          houveMudanca = true;
        }
      }
    }
  } else {
    // ─── Voltou pra on-grid: fecha queda aberta + resolve alertas ────────
    const quedaAberta = await prisma.foxessQueda.findFirst({
      where: { tenantId, siteId, fimEm: null },
      orderBy: { inicioEm: 'desc' },
    });

    if (quedaAberta) {
      const fim = new Date();
      const duracaoMin = Math.max(1, Math.round((fim.getTime() - quedaAberta.inicioEm.getTime()) / 60000));
      const resumo =
        `Energia restabelecida em ${unidadeNome}. ` +
        `Queda durou ${duracaoMin}min. ` +
        `SoC: ${quedaAberta.socInicial?.toFixed(0) ?? '?'}% -> ${soc?.toFixed(0) ?? '?'}% ` +
        `(minimo ${quedaAberta.socMinimo?.toFixed(0) ?? '?'}%).`;

      await prisma.foxessQueda.update({
        where: { id: quedaAberta.id },
        data: { fimEm: fim, duracaoMin, socFinal: soc, resumo },
      });

      // Alerta informativo de restabelecimento (prioridade BAIXA ou MEDIA
      // conforme preferir — uso MEDIA pra chegar no Telegram tambem).
      await upsertAlerta({
        tenantId,
        id: buildAlertId(tenantId, ALERT_CATEGORIAS.FOXESS_ENERGIA, siteId, 'restabelecida'),
        titulo: `Energia restabelecida em ${unidadeNome}`,
        subtitulo: resumo,
        prioridade: ALERT_PRIORIDADES.MEDIA,
        tipoEvento: ALERT_EVENTOS.FOXESS_ENERGIA_RESTABELECIDA,
      });
      houveMudanca = true;
    }

    // Resolve alertas de queda ativa + SoC se nao houver mais queda em curso
    await resolverAlerta(tenantId, alertaIdQueda(tenantId, siteId));
    await resolverAlerta(tenantId, alertaIdSocBaixo(tenantId, siteId));
    await resolverAlerta(tenantId, alertaIdSocCritico(tenantId, siteId));
  }

  if (houveMudanca) {
    await publicarContagemAlertasParaTenant({ tenantId }).catch(() => {});
  }
}
