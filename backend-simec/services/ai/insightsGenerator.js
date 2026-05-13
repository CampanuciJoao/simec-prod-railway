// Gerador de insights da IA — derivado direto dos eventos do Knowledge Layer.
//
// 5 detectores rodando em paralelo, cada um responsavel por 1 tipo de insight:
//
//   1. reincidencia_causa
//      Equipamento com >= 2 eventos da MESMA causaCategoria nos ultimos 180 dias.
//      Sinaliza que o problema NAO foi resolvido na raiz.
//
//   2. anomalia_helio
//      Equipamento cujo helio caiu mais de 5 pontos percentuais nos ultimos 30
//      dias (regressao linear simples). Antes do limiar fixo do gehcMonitor
//      disparar critico, ja avisa.
//
//   3. risco_alto
//      Score baseado em soma ponderada de eventos por severidade e recencia.
//      Substitui a formula manual atual (equipamentoRiskScoreService) usando
//      dados unificados em vez de tabelas isoladas.
//
//   4. sem_pm_recente
//      Equipamento sem evento 'pm_ge' OU 'manutencao_concluida_preventiva' nos
//      ultimos 270 dias (PM trimestral GE atrasada > 30d).
//
//   5. acionamento_freq_terceiro
//      Equipamento com >= 3 visitas de terceiro concluidas nos ultimos 90d.
//      Sinaliza dependencia critica de fornecedor.
//
// Cada detector emite 0 ou 1 insight por equipamento (unique parcial em
// (equipamento, tipo) WHERE resolvidoEm IS NULL — auto-deduplica). Insights
// que "saem do radar" (ex: helio se recupera) ficam com resolvidoEm setado
// no proximo run.

import prisma from '../prismaService.js';
import { estaAtivo, PIPELINE_NAMES } from './aiPipelineState.js';
import { ehEquipamentoRM } from '../equipamento/equipamentoModalidade.js';

const JANELA_REINCIDENCIA_DIAS  = 180;
const MIN_EVENTOS_REINCIDENCIA  = 2;

const JANELA_HELIO_DIAS         = 30;
const QUEDA_MIN_HELIO_PCT       = 5;

const JANELA_RISCO_DIAS         = 90;
const PESO_SEVERIDADE = { info: 0, low: 1, medium: 3, high: 7, critical: 15 };
const LIMIAR_RISCO_ALTO         = 30;

const PM_OK_HORIZONTE_DIAS      = 270;

const JANELA_ACIONAMENTO_DIAS   = 90;
const MIN_ACIONAMENTOS          = 3;

// Tipos de evento que indicam manutencao concluida — qualquer fonte. Eventos
// anteriores a uma manutencao concluida sao descartados nos detectores que
// medem "estado atual" do equipamento (risco_alto, reincidencia_causa).
// Premissa: tecnico que entrou no equipamento tipicamente inspeciona e ajusta
// alem do escopo declarado, entao reseta o relogio dos sintomas anteriores.
const TIPOS_MANUTENCAO_CONCLUIDA = [
  'pm_ge',
  'corretiva_ge',
  'manutencao_concluida_preventiva',
  'manutencao_concluida_corretiva',
  'manutencao_concluida_desconhecida',
  'os_corretiva_concluida',
  'visita_terceiro_concluida',
];

// Causas de reincidencia que so fazem sentido em equipamentos de Ressonancia
// Magnetica. Se o equipamento nao for RM, sao ignoradas pelo detector.
const CAUSAS_RM_ESPECIFICAS = new Set(['magneto_helio', 'cryo_compressor']);
// ehEquipamentoRM importado de ../equipamento/equipamentoModalidade.js

async function obterDataUltimaManutencao({ tenantId, equipamentoId, desde }) {
  const ev = await prisma.eventoEquipamento.findFirst({
    where: {
      tenantId, equipamentoId,
      ocorridoEm: { gte: desde },
      tipoEvento: { in: TIPOS_MANUTENCAO_CONCLUIDA },
    },
    orderBy: { ocorridoEm: 'desc' },
    select: { ocorridoEm: true },
  });
  return ev?.ocorridoEm || null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diasAtras(n) {
  return new Date(Date.now() - n * 86_400_000);
}

async function upsertInsight({ tenantId, equipamentoId, tipo, severidade, titulo, descricao, recomendacao, evidencia, validoAteDias = 30 }) {
  const validoAte = new Date(Date.now() + validoAteDias * 86_400_000);
  const existente = await prisma.iaInsight.findFirst({
    where: { tenantId, equipamentoId, tipo, resolvidoEm: null },
  });
  if (existente) {
    return prisma.iaInsight.update({
      where: { id: existente.id },
      data: {
        severidade, titulo, descricao, recomendacao, validoAte,
        evidenciaJson: evidencia,
        feedbackUtil: null,
        feedbackEm: null,
      },
    });
  }
  return prisma.iaInsight.create({
    data: {
      tenantId, equipamentoId, tipo, severidade,
      titulo, descricao, recomendacao,
      evidenciaJson: evidencia,
      validoAte,
    },
  });
}

async function resolverInsightSeExistir({ tenantId, equipamentoId, tipo }) {
  await prisma.iaInsight.updateMany({
    where: { tenantId, equipamentoId, tipo, resolvidoEm: null },
    data: { resolvidoEm: new Date() },
  });
}

// ─── Detector 1: reincidencia de causa ──────────────────────────────────────

async function detectarReincidenciaCausa({ tenantId, equipamentoId }) {
  const desde = diasAtras(JANELA_REINCIDENCIA_DIAS);

  // Reset por manutencao: ignora eventos anteriores a manutencao concluida
  // (tecnico endereco o problema, reincidencia anterior nao deve ressuscitar).
  const ultimaManutencao = await obterDataUltimaManutencao({ tenantId, equipamentoId, desde });
  const filtroData = ultimaManutencao
    ? { gt: ultimaManutencao }
    : { gte: desde };

  const eq = await prisma.equipamento.findUnique({
    where: { tenantId_id: { tenantId, id: equipamentoId } },
    select: { tipo: true },
  });
  const isRM = ehEquipamentoRM(eq?.tipo);

  const eventos = await prisma.eventoEquipamento.findMany({
    where: {
      tenantId, equipamentoId,
      causaCategoria: { not: null },
      ocorridoEm: filtroData,
    },
    orderBy: { ocorridoEm: 'desc' },
  });

  // Agrupa por causaCategoria, descartando causas RM-especificas em
  // equipamentos nao-RM (defesa em profundidade contra cadastro errado
  // de tipo ou eventos legados de telemetria).
  const porCausa = new Map();
  for (const ev of eventos) {
    if (CAUSAS_RM_ESPECIFICAS.has(ev.causaCategoria) && !isRM) continue;
    const lista = porCausa.get(ev.causaCategoria) || [];
    lista.push(ev);
    porCausa.set(ev.causaCategoria, lista);
  }

  // Pega a causa com maior reincidencia
  let maior = null;
  for (const [causa, lista] of porCausa) {
    if (lista.length >= MIN_EVENTOS_REINCIDENCIA && (!maior || lista.length > maior.lista.length)) {
      maior = { causa, lista };
    }
  }

  if (!maior) {
    await resolverInsightSeExistir({ tenantId, equipamentoId, tipo: 'reincidencia_causa' });
    return null;
  }

  const recomendacaoPorCausa = {
    infra_chiller_cliente: 'Esta reincidência indica problema de infraestrutura predial (chiller). Recomenda-se notificar o cliente para inspeção do sistema de refrigeração do prédio — não é falha do magneto.',
    cryo_compressor:       'Compressor do criostato apresenta reincidência. Considere troca preventiva do compressor antes da próxima falha.',
    magneto_helio:         'Reincidência em parâmetros de hélio. Avaliar refill antecipado e inspeção do sistema de criogenia.',
    bobina:                'Reincidência em bobinas. Pode indicar conector ou cabeamento com falha intermitente — solicitar inspeção dedicada.',
    mesa_mecanica:         'Reincidência em mesa mecânica. Avaliar substituição preventiva de correias e motor.',
    software:              'Reincidência em problemas de software. Avaliar atualização completa de SW e service packs.',
  };

  return upsertInsight({
    tenantId, equipamentoId,
    tipo: 'reincidencia_causa',
    severidade: maior.lista.length >= 3 ? 'high' : 'medium',
    titulo: `${maior.lista.length}× reincidência: ${maior.causa.replace(/_/g, ' ')}`,
    descricao: `Foram detectados ${maior.lista.length} eventos com a mesma causa-raiz "${maior.causa}" nos últimos ${JANELA_REINCIDENCIA_DIAS} dias. Indica que o problema não está sendo resolvido na raiz.`,
    recomendacao: recomendacaoPorCausa[maior.causa] || 'Avaliar mudança de estratégia de manutenção — a causa atual está se repetindo.',
    evidencia: {
      causa: maior.causa,
      eventos: maior.lista.slice(0, 5).map((e) => ({
        id: e.id,
        ocorridoEm: e.ocorridoEm,
        resumo: e.resumo,
        fonte: e.fonte,
      })),
      janelaDias: JANELA_REINCIDENCIA_DIAS,
    },
    validoAteDias: 60,
  });
}

// ─── Detector 2: anomalia de helio ──────────────────────────────────────────
//
// Pega snapshots dos ultimos 30d, ajusta uma reta y = a*x + b por minimos
// quadrados sobre (dias_decorridos, helio_pct). Se a*30 < -QUEDA_MIN_HELIO_PCT,
// emite alerta.

async function detectarAnomaliaHelio({ tenantId, equipamentoId }) {
  const desde = diasAtras(JANELA_HELIO_DIAS);
  const snapshots = await prisma.gehcSaudeSnapshot.findMany({
    where: { tenantId, equipamentoId, capturedAt: { gte: desde }, heliumLevelPct: { not: null } },
    select: { capturedAt: true, heliumLevelPct: true },
    orderBy: { capturedAt: 'asc' },
  });

  if (snapshots.length < 5) {
    await resolverInsightSeExistir({ tenantId, equipamentoId, tipo: 'anomalia_helio' });
    return null;
  }

  // Regressao linear simples
  const t0 = snapshots[0].capturedAt.getTime();
  const xs = snapshots.map((s) => (s.capturedAt.getTime() - t0) / 86_400_000);
  const ys = snapshots.map((s) => s.heliumLevelPct);
  const n  = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sxx = xs.reduce((acc, x) => acc + x * x, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx); // pp por dia

  const quedaProjetada30d = -slope * 30; // se positivo = caindo

  if (quedaProjetada30d < QUEDA_MIN_HELIO_PCT) {
    await resolverInsightSeExistir({ tenantId, equipamentoId, tipo: 'anomalia_helio' });
    return null;
  }

  const ultimoHelio = ys[ys.length - 1];

  return upsertInsight({
    tenantId, equipamentoId,
    tipo: 'anomalia_helio',
    severidade: quedaProjetada30d > 15 ? 'critical' : (quedaProjetada30d > 10 ? 'high' : 'medium'),
    titulo: `Hélio caindo ${quedaProjetada30d.toFixed(1)} pp/30d`,
    descricao: `Tendência anormal de queda de hélio detectada nos últimos ${JANELA_HELIO_DIAS} dias. Nível atual: ${ultimoHelio.toFixed(1)}%.`,
    recomendacao: 'Inspecionar cryocooler e considerar refill de hélio antes que o nível atinja faixa crítica (<30%). Verificar histórico de quench recente.',
    evidencia: {
      ultimoHelioPct: ultimoHelio,
      quedaPorDiaPct: -slope,
      quedaProjetada30dPct: quedaProjetada30d,
      amostras: snapshots.length,
      janelaDias: JANELA_HELIO_DIAS,
    },
    validoAteDias: 14,
  });
}

// ─── Detector 3: risco alto (score baseado em eventos) ──────────────────────

async function detectarRiscoAlto({ tenantId, equipamentoId }) {
  const desde = diasAtras(JANELA_RISCO_DIAS);

  // Reset por manutencao: descarta eventos anteriores a manutencao concluida.
  const ultimaManutencao = await obterDataUltimaManutencao({ tenantId, equipamentoId, desde });
  const filtroData = ultimaManutencao
    ? { gt: ultimaManutencao }
    : { gte: desde };

  const eventos = await prisma.eventoEquipamento.findMany({
    where: {
      tenantId, equipamentoId,
      ocorridoEm: filtroData,
      // Nao conta os proprios eventos de manutencao no score
      tipoEvento: { notIn: TIPOS_MANUTENCAO_CONCLUIDA },
    },
    select: { severidade: true, ocorridoEm: true, fonte: true, tipoEvento: true },
  });

  // DEDUPLICACAO POR DIA + TIPO: telemetria gera 1 snapshot a cada 30min, e
  // sem dedup um equipamento offline por 1 dia inteiro acumulava 48 eventos
  // 'compressor_off' high — score artificialmente inflado para milhares.
  // Aqui contamos no maximo 1 evento por (dia, tipo_evento), mantendo o
  // de maior severidade.
  const eventosUnicos = new Map();
  for (const ev of eventos) {
    const dia = ev.ocorridoEm.toISOString().slice(0, 10);
    const chave = `${dia}|${ev.tipoEvento}`;
    const existente = eventosUnicos.get(chave);
    const pesoNovo = PESO_SEVERIDADE[ev.severidade] ?? 0;
    const pesoExistente = existente ? (PESO_SEVERIDADE[existente.severidade] ?? 0) : -1;
    if (!existente || pesoNovo > pesoExistente) {
      eventosUnicos.set(chave, ev);
    }
  }

  // Score = soma de pesos com decaimento por recencia (1 -> 0.5 ao longo da janela)
  let score = 0;
  for (const ev of eventosUnicos.values()) {
    const peso = PESO_SEVERIDADE[ev.severidade] ?? 0;
    const idadeDias = (Date.now() - ev.ocorridoEm.getTime()) / 86_400_000;
    const fator = Math.max(0.3, 1 - (idadeDias / JANELA_RISCO_DIAS) * 0.5);
    score += peso * fator;
  }
  const scoreFinal = Math.round(score);

  // Atualiza coluna riskScore do equipamento (para coexistir com a formula
  // antiga). Quando estabilizar, pode-se desligar a formula antiga.
  try {
    await prisma.equipamento.update({
      where: { tenantId_id: { tenantId, id: equipamentoId } },
      data: { riskScore: scoreFinal, riskUpdatedAt: new Date() },
    });
  } catch { /* eq pode ter sumido entre queries */ }

  if (scoreFinal < LIMIAR_RISCO_ALTO) {
    await resolverInsightSeExistir({ tenantId, equipamentoId, tipo: 'risco_alto' });
    return null;
  }

  const eventosDeduplicados = [...eventosUnicos.values()];
  const breakdownDedup = ['critical', 'high', 'medium', 'low'].map((s) => ({
    severidade: s,
    total: eventosDeduplicados.filter((e) => e.severidade === s).length,
  })).filter((b) => b.total > 0);

  return upsertInsight({
    tenantId, equipamentoId,
    tipo: 'risco_alto',
    severidade: scoreFinal >= 60 ? 'critical' : 'high',
    titulo: `Score de risco preditivo: ${scoreFinal}`,
    descricao: ultimaManutencao
      ? `Desde a última manutenção concluída (${ultimaManutencao.toISOString().slice(0, 10)}), o equipamento acumulou ${eventosDeduplicados.length} dia(s) com eventos de severidade. Score considera severidade ponderada e recência (1 evento por dia/tipo).`
      : `Equipamento acumulou ${eventosDeduplicados.length} dia(s) com eventos de severidade nos últimos ${JANELA_RISCO_DIAS} dias. Score considera severidade ponderada e recência (1 evento por dia/tipo).`,
    recomendacao: 'Revisar histórico recente do equipamento (corretivas, anomalias de telemetria, acionamentos de terceiro) e considerar avaliação técnica antes da próxima falha.',
    evidencia: {
      scoreFinal,
      janelaDias: JANELA_RISCO_DIAS,
      diasComEventos: eventosDeduplicados.length,
      totalEventosBrutos: eventos.length,
      breakdown: breakdownDedup,
      ultimaManutencaoConcluida: ultimaManutencao || null,
    },
    validoAteDias: 30,
  });
}

// ─── Detector 4: sem PM recente ─────────────────────────────────────────────

async function detectarSemPmRecente({ tenantId, equipamentoId }) {
  const eq = await prisma.equipamento.findUnique({
    where: { tenantId_id: { tenantId, id: equipamentoId } },
    select: {
      gehcAssetId: true,
      createdAt: true,
      dataInstalacao: true,
      gehcContrato: { select: { contractExpiration: true } },
    },
  });

  // Equipamento GE sem contrato de manutencao ativo nao tem expectativa de
  // PM externa — pular o detector. Sem isso, gera falso positivo eterno
  // pois pm_ge nunca aparecera.
  const ehGE = Boolean(eq?.gehcAssetId);
  const contratoExpira = eq?.gehcContrato?.contractExpiration ?? null;
  const contratoAtivo = contratoExpira === null
    ? Boolean(eq?.gehcContrato) // existe contrato sem data de expiracao
    : contratoExpira > new Date();
  if (ehGE && !contratoAtivo) {
    await resolverInsightSeExistir({ tenantId, equipamentoId, tipo: 'sem_pm_recente' });
    return null;
  }

  // Equipamento muito novo no SIMEC nao tem historico suficiente para
  // afirmar que nao houve PM. Usa o mais recente entre createdAt (entrada
  // no SIMEC) e dataInstalacao (instalacao fisica) como referencia: se
  // qualquer um for mais recente que 'desde', o equipamento nao esta no
  // sistema/operante ha tempo suficiente para esperar PM atrasada.
  const desde = diasAtras(PM_OK_HORIZONTE_DIAS);
  const referenciasInicio = [eq?.createdAt, eq?.dataInstalacao].filter(Boolean);
  const inicioMonitoramento = referenciasInicio.length
    ? new Date(Math.max(...referenciasInicio.map((d) => d.getTime())))
    : null;
  if (inicioMonitoramento && inicioMonitoramento > desde) {
    await resolverInsightSeExistir({ tenantId, equipamentoId, tipo: 'sem_pm_recente' });
    return null;
  }
  const evPm = await prisma.eventoEquipamento.findFirst({
    where: {
      tenantId, equipamentoId,
      ocorridoEm: { gte: desde },
      OR: [
        { tipoEvento: 'pm_ge' },
        { tipoEvento: 'manutencao_concluida_preventiva' },
      ],
    },
    orderBy: { ocorridoEm: 'desc' },
    select: { ocorridoEm: true },
  });

  if (evPm) {
    await resolverInsightSeExistir({ tenantId, equipamentoId, tipo: 'sem_pm_recente' });
    return null;
  }

  return upsertInsight({
    tenantId, equipamentoId,
    tipo: 'sem_pm_recente',
    severidade: 'medium',
    titulo: 'Sem PM nos últimos 9 meses',
    descricao: `Não há registro de manutenção preventiva (interna ou GE) nos últimos ${PM_OK_HORIZONTE_DIAS} dias.`,
    recomendacao: 'Agendar PM trimestral o quanto antes. Equipamentos sem PM recente têm probabilidade significativamente maior de corretiva não-planejada.',
    evidencia: { horizonteDias: PM_OK_HORIZONTE_DIAS },
    validoAteDias: 60,
  });
}

// ─── Detector 5: acionamento frequente de terceiro ──────────────────────────

async function detectarAcionamentoFreqTerceiro({ tenantId, equipamentoId }) {
  const desde = diasAtras(JANELA_ACIONAMENTO_DIAS);
  const visitas = await prisma.eventoEquipamento.findMany({
    where: {
      tenantId, equipamentoId,
      ocorridoEm: { gte: desde },
      fonte: 'visita_terceiro',
    },
    select: { ocorridoEm: true, detalhesJson: true },
  });

  if (visitas.length < MIN_ACIONAMENTOS) {
    await resolverInsightSeExistir({ tenantId, equipamentoId, tipo: 'acionamento_freq_terceiro' });
    return null;
  }

  const prestadores = new Set();
  for (const v of visitas) {
    if (v.detalhesJson?.prestadorNome) prestadores.add(v.detalhesJson.prestadorNome);
  }

  return upsertInsight({
    tenantId, equipamentoId,
    tipo: 'acionamento_freq_terceiro',
    severidade: visitas.length >= 5 ? 'high' : 'medium',
    titulo: `${visitas.length}× acionamento de terceiro em 90d`,
    descricao: `Equipamento dependeu de visitas externas ${visitas.length} vezes nos últimos ${JANELA_ACIONAMENTO_DIAS} dias (prestadores: ${[...prestadores].join(', ') || 'sem nome'}).`,
    recomendacao: 'Avaliar contrato de manutenção: o nível de dependência sugere problema crônico ou que a equipe interna pode estar sem treinamento/peças para resolver os chamados.',
    evidencia: {
      totalVisitas: visitas.length,
      prestadores: [...prestadores],
      janelaDias: JANELA_ACIONAMENTO_DIAS,
    },
    validoAteDias: 30,
  });
}

// ─── Orquestrador por equipamento ───────────────────────────────────────────

async function gerarInsightsParaEquipamento({ tenantId, equipamentoId }) {
  await Promise.allSettled([
    detectarReincidenciaCausa({ tenantId, equipamentoId }),
    detectarAnomaliaHelio({ tenantId, equipamentoId }),
    detectarRiscoAlto({ tenantId, equipamentoId }),
    detectarSemPmRecente({ tenantId, equipamentoId }),
    detectarAcionamentoFreqTerceiro({ tenantId, equipamentoId }),
  ]);
}

// ─── Orquestrador por tenant ────────────────────────────────────────────────

export async function gerarInsightsTenant({ tenantId } = {}) {
  if (!tenantId) throw new Error('tenantId obrigatorio');

  const ativo = await estaAtivo(PIPELINE_NAMES.IA_INSIGHTS, tenantId);
  if (!ativo) return { motivo: 'pipeline_pausado', equipamentos: 0 };

  // Limpeza retroativa: resolve insights 'reincidencia_causa' com causa
  // RM-especifica em equipamentos que NAO sao de Ressonancia Magnetica
  // (sobras de versoes anteriores do detector ou cadastro errado de tipo).
  const insightsForaContexto = await prisma.iaInsight.findMany({
    where: {
      tenantId,
      tipo: 'reincidencia_causa',
      resolvidoEm: null,
    },
    select: { id: true, equipamentoId: true, evidenciaJson: true },
  });

  if (insightsForaContexto.length > 0) {
    const eqIdsAfetados = [...new Set(insightsForaContexto.map((i) => i.equipamentoId))];
    const equips = await prisma.equipamento.findMany({
      where: { tenantId, id: { in: eqIdsAfetados } },
      select: { id: true, tipo: true },
    });
    const tipoPorId = new Map(equips.map((e) => [e.id, e.tipo]));

    const idsParaResolver = insightsForaContexto
      .filter((i) => {
        const causa = i.evidenciaJson?.causa;
        if (!CAUSAS_RM_ESPECIFICAS.has(causa)) return false;
        return !ehEquipamentoRM(tipoPorId.get(i.equipamentoId));
      })
      .map((i) => i.id);

    if (idsParaResolver.length > 0) {
      await prisma.iaInsight.updateMany({
        where: { id: { in: idsParaResolver } },
        data: { resolvidoEm: new Date() },
      });
      console.log(`[IA_INSIGHTS] Limpeza: ${idsParaResolver.length} insight(s) reincidencia_causa RM em equipamentos nao-RM resolvidos.`);
    }
  }

  // So roda para equipamentos que (a) tem pelo menos 1 evento no
  // Knowledge Layer E (b) NAO estao Vendidos/Desativados.
  const eqsComEventos = await prisma.eventoEquipamento.findMany({
    where: {
      tenantId,
      equipamento: { status: { notIn: ['Vendido', 'Desativado'] } },
    },
    select: { equipamentoId: true },
    distinct: ['equipamentoId'],
  });

  console.log(`[IA_INSIGHTS] Tenant=${tenantId} — analisando ${eqsComEventos.length} equipamento(s).`);

  for (const { equipamentoId } of eqsComEventos) {
    if (!(await estaAtivo(PIPELINE_NAMES.IA_INSIGHTS, tenantId))) break;
    try {
      await gerarInsightsParaEquipamento({ tenantId, equipamentoId });
    } catch (err) {
      console.error(`[IA_INSIGHTS] Erro eq ${equipamentoId}:`, err.message);
    }
  }

  return { equipamentos: eqsComEventos.length };
}

export async function gerarInsightsTodosTenants() {
  const ativoGlobal = await estaAtivo(PIPELINE_NAMES.IA_INSIGHTS);
  if (!ativoGlobal) return { motivo: 'pipeline_globalmente_pausado' };

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
  });

  let total = 0;
  for (const t of tenants) {
    try {
      const r = await gerarInsightsTenant({ tenantId: t.id });
      total += r.equipamentos || 0;
    } catch (err) {
      console.error(`[IA_INSIGHTS] Tenant ${t.nome} falhou:`, err.message);
    }
  }

  return { tenants: tenants.length, equipamentosAnalisados: total };
}
