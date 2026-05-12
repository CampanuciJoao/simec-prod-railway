// Knowledge Layer Sync — produtores que materializam evento_equipamento.
//
// Cada produtor:
//   1. Le incrementalmente da sua fonte (use updatedAt > ultima execucao)
//   2. Mapeia para o formato comum {fonte, tipoEvento, severidade, causa, resumo, detalhes}
//   3. Faz upsert idempotente via (refFonteTipo, refFonteId, tipoEvento)
//
// Sao 5 produtores hoje:
//   1. PDF GE extraido        -> 1 evento por OS GE (corretiva ou pm)
//   2. Telemetria GE          -> eventos so quando ha anomalia detectada
//   3. OS interna SIMEC       -> 1 evento por OS interna (abertura) +
//                                1 ao concluir (futuro)
//   4. Visita de terceiro     -> 1 evento por visita (agendada/concluida)
//   5. Alerta GEHC saude      -> 1 evento por alerta gerado
//
// Os produtores rodam em paralelo dentro do tenant. Falha de um nao bloqueia
// os outros.

import prisma from '../prismaService.js';
import { estaAtivo, PIPELINE_NAMES } from '../ai/aiPipelineState.js';

// ─── Helpers comuns ──────────────────────────────────────────────────────────

async function upsertEvento(evento) {
  // upsert via composite unique (refFonteTipo, refFonteId, tipoEvento)
  const existente = await prisma.eventoEquipamento.findFirst({
    where: {
      refFonteTipo: evento.refFonteTipo,
      refFonteId:   evento.refFonteId,
      tipoEvento:   evento.tipoEvento,
    },
    select: { id: true },
  });

  if (existente) {
    await prisma.eventoEquipamento.update({
      where: { id: existente.id },
      data: {
        ocorridoEm:     evento.ocorridoEm,
        severidade:     evento.severidade,
        causaCategoria: evento.causaCategoria,
        resumo:         evento.resumo,
        detalhesJson:   evento.detalhesJson,
      },
    });
    return 'updated';
  }

  await prisma.eventoEquipamento.create({ data: evento });
  return 'created';
}

function trunc(s, n = 240) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ─── Produtor 1: PDFs GE extraidos ──────────────────────────────────────────

async function produzirEventosPdfGE({ tenantId }) {
  const extraidos = await prisma.gehcPdfExtraido.findMany({
    where: { tenantId, extraidoEm: { not: null } },
    include: {
      pdfDocumento: {
        include: { ordemServico: true },
      },
    },
  });

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (const ex of extraidos) {
    try {
      const os = ex.pdfDocumento?.ordemServico;
      if (!os) continue;

      const ehPm = os.serviceTypeCode === 'SE02';
      const tipoEvento = ehPm ? 'pm_ge' : 'corretiva_ge';
      const severidade = ehPm ? 'low' : (
        ex.equipmentStatus?.toLowerCase().includes('down') ? 'high' : 'medium'
      );

      const ocorridoEm = ex.openedAt || os.requestedAt || ex.extraidoEm;
      const resumo = trunc(
        ex.rootCauseRaw
          ? `${ehPm ? 'PM' : 'Corretiva'} GE — ${ex.rootCauseRaw}`
          : `${ehPm ? 'PM' : 'Corretiva'} GE — ${os.problemDescription || 'sem descricao'}`
      );

      const r = await upsertEvento({
        tenantId,
        equipamentoId: ex.pdfDocumento.equipamentoId,
        ocorridoEm,
        fonte: 'pdf_ge',
        tipoEvento,
        severidade,
        causaCategoria: ex.rootCauseCategory,
        resumo,
        detalhesJson: {
          caseNumber:       ex.caseNumber,
          woNumber:         ex.woNumber,
          equipmentStatus:  ex.equipmentStatus,
          engineerFullName: ex.engineerFullName,
          totalMinutes:     ex.totalMinutes,
          measurements:     ex.measurementsJson,
          partsReplaced:    ex.partsReplacedJson,
          actionsTakenSummary: trunc(ex.actionsTaken, 500),
        },
        refFonteTipo: 'gehc_pdf_extraido',
        refFonteId:   ex.id,
      });
      if (r === 'created') criados++;
      else atualizados++;
    } catch (err) {
      console.error(`[KL_PRODUTOR_PDF_GE] Erro ${ex.id}:`, err.message);
      erros++;
    }
  }

  return { fonte: 'pdf_ge', criados, atualizados, erros, total: extraidos.length };
}

// ─── Produtor 2: Telemetria GE (anomalias) ──────────────────────────────────
//
// Para nao explodir a tabela com 1 evento por snapshot (sao a cada 30min),
// emitimos eventos so quando ha condicao anormal: helio fora de spec,
// compressor off, magneto offline. O score preditivo mais sofisticado sai
// no PR4 — aqui usamos limiares simples.

async function produzirEventosTelemetriaGE({ tenantId }) {
  // Olha so snapshots dos ultimos 7 dias para nao retroprocessar tudo a cada
  // execucao. O cron roda diariamente, entao 7d cobre rebuilds com folga.
  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const snapshots = await prisma.gehcSaudeSnapshot.findMany({
    where: { tenantId, capturedAt: { gte: desde } },
    select: {
      id: true,
      equipamentoId: true,
      capturedAt: true,
      heliumLevelPct: true,
      heliumPressurePsi: true,
      compressorStatus: true,
      coolantTempC: true,
      magnetOnline: true,
    },
  });

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (const s of snapshots) {
    try {
      // Detecta condicoes anormais e emite UM evento por (snapshot, tipo).
      const eventos = [];

      if (typeof s.heliumLevelPct === 'number') {
        if (s.heliumLevelPct < 30) {
          eventos.push({
            tipoEvento: 'helio_critico',
            severidade: 'critical',
            resumo: `Helio em ${s.heliumLevelPct}% — risco iminente de quench`,
          });
        } else if (s.heliumLevelPct < 50) {
          eventos.push({
            tipoEvento: 'helio_baixo',
            severidade: 'medium',
            resumo: `Helio em ${s.heliumLevelPct}% — abaixo do recomendado`,
          });
        }
      }

      if (s.compressorStatus && s.compressorStatus.toUpperCase() !== 'ON') {
        eventos.push({
          tipoEvento: 'compressor_off',
          severidade: 'high',
          resumo: `Compressor ${s.compressorStatus}`,
        });
      }

      if (s.magnetOnline === false) {
        eventos.push({
          tipoEvento: 'magneto_offline',
          severidade: 'critical',
          resumo: 'Magneto offline',
        });
      }

      if (typeof s.coolantTempC === 'number' && s.coolantTempC > 25) {
        eventos.push({
          tipoEvento: 'temperatura_coolant_alta',
          severidade: s.coolantTempC > 30 ? 'high' : 'medium',
          resumo: `Temperatura do coolant ${s.coolantTempC}°C`,
        });
      }

      for (const ev of eventos) {
        const r = await upsertEvento({
          tenantId,
          equipamentoId: s.equipamentoId,
          ocorridoEm: s.capturedAt,
          fonte: 'telemetria_ge',
          tipoEvento: ev.tipoEvento,
          severidade: ev.severidade,
          causaCategoria: 'magneto_helio',
          resumo: ev.resumo,
          detalhesJson: {
            heliumLevelPct:    s.heliumLevelPct,
            heliumPressurePsi: s.heliumPressurePsi,
            compressorStatus:  s.compressorStatus,
            coolantTempC:      s.coolantTempC,
            magnetOnline:      s.magnetOnline,
          },
          refFonteTipo: 'gehc_saude_snapshot',
          refFonteId: s.id,
        });
        if (r === 'created') criados++;
        else atualizados++;
      }
    } catch (err) {
      console.error(`[KL_PRODUTOR_TELEMETRIA] Erro snapshot ${s.id}:`, err.message);
      erros++;
    }
  }

  return { fonte: 'telemetria_ge', criados, atualizados, erros, total: snapshots.length };
}

// ─── Produtor 3: OS interna SIMEC (Manutencao + OsCorretiva) ─────────────────

async function produzirEventosOSInterna({ tenantId }) {
  // Manutencoes (preventivas + corretivas internas)
  const manutencoes = await prisma.manutencao.findMany({
    where: { tenantId },
    select: {
      id: true, equipamentoId: true, tipo: true, status: true,
      numeroOS: true, descricaoProblemaServico: true,
      dataHoraAgendamentoInicio: true, dataConclusao: true, createdAt: true,
    },
  });

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (const m of manutencoes) {
    try {
      const ocorridoEm = m.dataHoraAgendamentoInicio || m.createdAt;
      const concluida = m.status === 'Concluida';
      const tipoEvento = concluida
        ? `manutencao_concluida_${m.tipo?.toLowerCase() || 'desconhecida'}`
        : `manutencao_aberta_${m.tipo?.toLowerCase() || 'desconhecida'}`;

      const r = await upsertEvento({
        tenantId,
        equipamentoId: m.equipamentoId,
        ocorridoEm,
        fonte: 'os_simec',
        tipoEvento,
        severidade: m.tipo === 'Corretiva' ? 'medium' : 'low',
        causaCategoria: null, // ainda sem normalizacao para OS interna
        resumo: trunc(`${m.tipo || 'OS'} #${m.numeroOS} — ${m.descricaoProblemaServico || m.status}`),
        detalhesJson: {
          numeroOS: m.numeroOS,
          tipo: m.tipo,
          status: m.status,
          dataConclusao: m.dataConclusao,
        },
        refFonteTipo: 'manutencao',
        refFonteId: m.id,
      });
      if (r === 'created') criados++;
      else atualizados++;
    } catch (err) {
      console.error(`[KL_PRODUTOR_OS_INTERNA] Erro ${m.id}:`, err.message);
      erros++;
    }
  }

  // OsCorretivas (fluxo novo do produto)
  const osCorretivas = await prisma.osCorretiva.findMany({
    where: { tenantId },
    select: {
      id: true, equipamentoId: true, numeroOS: true, descricaoProblema: true,
      statusEquipamentoAbertura: true, status: true, tipo: true,
      dataHoraAbertura: true, dataHoraConclusao: true,
    },
  });

  for (const o of osCorretivas) {
    try {
      const concluida = o.status === 'Concluida';
      const tipoEvento = concluida ? 'os_corretiva_concluida' : 'os_corretiva_aberta';
      const severidade = o.statusEquipamentoAbertura === 'ForaDeUso' ? 'high'
        : o.statusEquipamentoAbertura === 'UsoLimitado' ? 'medium'
        : 'low';

      const r = await upsertEvento({
        tenantId,
        equipamentoId: o.equipamentoId,
        ocorridoEm: o.dataHoraAbertura,
        fonte: 'os_simec',
        tipoEvento,
        severidade,
        causaCategoria: null,
        resumo: trunc(`OS Corretiva #${o.numeroOS} — ${o.descricaoProblema || o.status} (${o.statusEquipamentoAbertura})`),
        detalhesJson: {
          numeroOS: o.numeroOS,
          tipo: o.tipo,
          status: o.status,
          statusEquipamentoAbertura: o.statusEquipamentoAbertura,
          dataHoraConclusao: o.dataHoraConclusao,
        },
        refFonteTipo: 'os_corretiva',
        refFonteId: o.id,
      });
      if (r === 'created') criados++;
      else atualizados++;
    } catch (err) {
      console.error(`[KL_PRODUTOR_OSC] Erro ${o.id}:`, err.message);
      erros++;
    }
  }

  return {
    fonte: 'os_simec', criados, atualizados, erros,
    total: manutencoes.length + osCorretivas.length,
  };
}

// ─── Produtor 4: Visita de terceiro (acionamento externo) ───────────────────

async function produzirEventosVisitaTerceiro({ tenantId }) {
  const visitas = await prisma.visitaTerceiro.findMany({
    where: { tenantId },
    include: {
      osCorretiva: {
        select: { equipamentoId: true, numeroOS: true },
      },
    },
  });

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (const v of visitas) {
    try {
      const equipamentoId = v.osCorretiva?.equipamentoId;
      if (!equipamentoId) continue;

      const concluida = v.status === 'Concluida';
      const tipoEvento = concluida ? 'visita_terceiro_concluida' : 'visita_terceiro_agendada';
      const ocorridoEm = concluida
        ? (v.dataHoraFimReal || v.dataHoraInicioReal || v.dataHoraInicioPrevista)
        : v.dataHoraInicioPrevista;

      const r = await upsertEvento({
        tenantId,
        equipamentoId,
        ocorridoEm,
        fonte: 'visita_terceiro',
        tipoEvento,
        severidade: 'medium',
        causaCategoria: null,
        resumo: trunc(`Visita ${v.prestadorNome} — OS #${v.osCorretiva?.numeroOS} — ${concluida ? `resultado: ${v.resultado || 'sem-resultado'}` : `agendada para ${v.dataHoraInicioPrevista?.toISOString?.()?.slice(0, 10)}`}`),
        detalhesJson: {
          prestadorNome:          v.prestadorNome,
          status:                 v.status,
          resultado:              v.resultado,
          dataHoraInicioPrevista: v.dataHoraInicioPrevista,
          dataHoraFimPrevista:    v.dataHoraFimPrevista,
          dataHoraInicioReal:     v.dataHoraInicioReal,
          dataHoraFimReal:        v.dataHoraFimReal,
          observacoes:            trunc(v.observacoes, 500),
        },
        refFonteTipo: 'visita_terceiro',
        refFonteId: v.id,
      });
      if (r === 'created') criados++;
      else atualizados++;
    } catch (err) {
      console.error(`[KL_PRODUTOR_VISITA] Erro ${v.id}:`, err.message);
      erros++;
    }
  }

  return { fonte: 'visita_terceiro', criados, atualizados, erros, total: visitas.length };
}

// ─── Produtor 5: Alertas GEHC (helio, compressor, etc) ──────────────────────
//
// Usa a tabela Alerta filtrando por tipo GEHC_SAUDE — esses alertas ja sao
// gerados pelo gehcMonitor quando detecta condicao critica.

async function produzirEventosAlertasGEHC({ tenantId }) {
  // Alertas sao linkados ao equipamento por meio do campo `link` (URL).
  // Aqui buscamos so os com tipo GEHC_SAUDE e fazemos parse do link para
  // extrair equipamentoId. Se nao conseguir, pula.
  const alertas = await prisma.alerta.findMany({
    where: { tenantId, tipo: 'GEHC_SAUDE' },
    select: {
      id: true, titulo: true, subtitulo: true, prioridade: true,
      tipoEvento: true, link: true, data: true,
    },
  });

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (const a of alertas) {
    try {
      // Tenta extrair equipamentoId do link no formato /equipamentos/detalhes/{id}
      const match = a.link?.match(/equipamentos\/detalhes\/([a-f0-9-]+)/i);
      if (!match) continue;
      const equipamentoId = match[1];

      const severidade = a.prioridade === 'Alta' ? 'high'
        : a.prioridade === 'Media' ? 'medium' : 'low';

      const r = await upsertEvento({
        tenantId,
        equipamentoId,
        ocorridoEm: a.data,
        fonte: 'alerta_telemetria',
        tipoEvento: a.tipoEvento || 'alerta_gehc',
        severidade,
        causaCategoria: 'magneto_helio',
        resumo: trunc(`${a.titulo}${a.subtitulo ? ` — ${a.subtitulo}` : ''}`),
        detalhesJson: {
          tipoEvento: a.tipoEvento,
          prioridade: a.prioridade,
          link: a.link,
        },
        refFonteTipo: 'alerta',
        refFonteId: a.id,
      });
      if (r === 'created') criados++;
      else atualizados++;
    } catch (err) {
      console.error(`[KL_PRODUTOR_ALERTA] Erro ${a.id}:`, err.message);
      erros++;
    }
  }

  return { fonte: 'alerta_telemetria', criados, atualizados, erros, total: alertas.length };
}

// ─── Orquestrador por tenant ─────────────────────────────────────────────────

export async function sincronizarKnowledgeLayerTenant({ tenantId } = {}) {
  if (!tenantId) throw new Error('tenantId obrigatorio');

  const ativo = await estaAtivo(PIPELINE_NAMES.KNOWLEDGE_LAYER, tenantId);
  if (!ativo) {
    console.log(`[KL_SYNC] Pipeline pausado para tenant ${tenantId}.`);
    return { motivo: 'pipeline_pausado' };
  }

  console.log(`[KL_SYNC] Iniciando sync tenant=${tenantId}.`);

  const resultados = await Promise.allSettled([
    produzirEventosPdfGE({ tenantId }),
    produzirEventosTelemetriaGE({ tenantId }),
    produzirEventosOSInterna({ tenantId }),
    produzirEventosVisitaTerceiro({ tenantId }),
    produzirEventosAlertasGEHC({ tenantId }),
  ]);

  const sumario = {};
  for (const r of resultados) {
    if (r.status === 'fulfilled') {
      sumario[r.value.fonte] = {
        criados: r.value.criados,
        atualizados: r.value.atualizados,
        erros: r.value.erros,
        total: r.value.total,
      };
    } else {
      sumario._erro = (sumario._erro || []).concat(r.reason?.message || 'desconhecido');
    }
  }

  console.log(`[KL_SYNC] Tenant=${tenantId} ok — ${JSON.stringify(sumario)}`);
  return sumario;
}

export async function sincronizarKnowledgeLayerTodosTenants() {
  const ativoGlobal = await estaAtivo(PIPELINE_NAMES.KNOWLEDGE_LAYER);
  if (!ativoGlobal) {
    console.log('[KL_SYNC] Pipeline globalmente pausado.');
    return { tenants: 0 };
  }

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
  });

  const resultadosPorTenant = [];
  for (const t of tenants) {
    try {
      const r = await sincronizarKnowledgeLayerTenant({ tenantId: t.id });
      resultadosPorTenant.push({ tenantId: t.id, nome: t.nome, ...r });
    } catch (err) {
      console.error(`[KL_SYNC] Tenant ${t.nome} falhou:`, err.message);
      resultadosPorTenant.push({ tenantId: t.id, nome: t.nome, erro: err.message });
    }
  }

  return { tenants: tenants.length, resultados: resultadosPorTenant };
}
