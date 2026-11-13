// Catalogo de falhas Solar (Fase 1). Roda via cron a cada 10min.
//
// Para cada SolarInverter ativo:
//   1. Chama adapter.fetchFalhas() se disponivel (Sungrow); senao, usa
//      fallback de ler currentFault do ultimo snapshot (FoxESS/Growatt)
//   2. Dedupe por codigoExterno — se ja existe linha aberta, so atualiza
//      ultimaConfirmacaoEm; se nova, insere e abre Alerta SIMEC + Telegram
//   3. Fecha falhas que pararam de aparecer ha mais de 2h
//      (ultimaConfirmacaoEm < now - 2h) — marca resolvidaEm e emite
//      alerta FOXESS_ENERGIA event SOLAR_FALHA_RESOLVIDA
//
// Niveis (convencao Sungrow):
//   1 fault      -> ALTA  + Telegram
//   2 alarm      -> MEDIA + Telegram
//   3 warn       -> BAIXA (sino SIMEC apenas)
//   4 suggestion -> BAIXA (sino SIMEC apenas)

import prisma from '../prismaService.js';
import { getAdapter } from './adapters/index.js';
import { decryptCredential } from './solarCrypto.js';
import { ALERT_CATEGORIAS, ALERT_EVENTOS, ALERT_PRIORIDADES } from '../alertas/alertTypes.js';
import { buildAlertId } from '../alertas/alertIdBuilder.js';
import { publicarContagemAlertasParaTenant } from '../alertas/alertasRealtimePublisher.js';
import { linkMonitoramentoSolar } from './solarAlertRepository.js';

const JANELA_SEM_CONFIRMACAO_MS = 2 * 60 * 60 * 1000;

function nivelParaEvento(nivel) {
  if (nivel === 1) return ALERT_EVENTOS.SOLAR_FALHA_CRITICA;
  if (nivel === 2) return ALERT_EVENTOS.SOLAR_FALHA_ALARME;
  return ALERT_EVENTOS.SOLAR_FALHA_AVISO;
}

function nivelParaPrioridade(nivel) {
  if (nivel === 1) return ALERT_PRIORIDADES.ALTA;
  if (nivel === 2) return ALERT_PRIORIDADES.MEDIA;
  return ALERT_PRIORIDADES.BAIXA;
}

async function emitirAlertaFalha({ falha, plant, tenantId }) {
  const alertaId = buildAlertId(
    tenantId,
    ALERT_CATEGORIAS.FOXESS_ENERGIA,
    `falha-${falha.id}`,
    `${plant.nome}-${falha.codigoExterno.slice(0, 20)}`
  );
  const titulo = falha.nivel === 1 ? `Falha critica: ${falha.nome}` : `Alerta: ${falha.nome}`;
  const subtitulo = `${plant.nome} (${plant.unidade?.nomeSistema || 'unidade'})`
    + (falha.descricao ? ` - ${falha.descricao.slice(0, 200)}` : '');
  const existente = await prisma.alerta.findUnique({
    where: { tenantId_id: { tenantId, id: alertaId } },
    select: { id: true },
  });
  if (existente) return;
  await prisma.alerta.create({
    data: {
      id: alertaId, tenantId, titulo, subtitulo, data: new Date(),
      prioridade: nivelParaPrioridade(falha.nivel),
      tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoEvento: nivelParaEvento(falha.nivel),
      link: linkMonitoramentoSolar(plant.id),
    },
  });
}

async function emitirAlertaResolvido({ falha, plant, tenantId }) {
  const alertaId = buildAlertId(
    tenantId,
    ALERT_CATEGORIAS.FOXESS_ENERGIA,
    `falha-resolvida-${falha.id}`,
    `${plant.nome}-${falha.codigoExterno.slice(0, 20)}`
  );
  await prisma.alerta.create({
    data: {
      id: alertaId, tenantId,
      titulo: `Falha resolvida: ${falha.nome}`,
      subtitulo: `${plant.nome}: condicao normalizada`,
      data: new Date(),
      prioridade: ALERT_PRIORIDADES.BAIXA,
      tipo: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoCategoria: ALERT_CATEGORIAS.FOXESS_ENERGIA,
      tipoEvento: ALERT_EVENTOS.SOLAR_FALHA_RESOLVIDA,
      link: linkMonitoramentoSolar(plant.id),
    },
  }).catch(() => { /* ignora se ja existe */ });
}

// Nome do app por provider — vai no texto do alerta pro usuario saber
// onde consultar detalhes da falha (SIMEC nao traduz o codigo bruto do
// inverter sem a API dedicada do fabricante).
const APP_POR_PROVIDER = {
  growatt: 'ShinePhone',
  foxess: 'FoxESS Cloud',
  sungrow: 'iSolarCloud',
};

function appDoProvider(provider) {
  return APP_POR_PROVIDER[String(provider || '').toLowerCase()] || 'aplicativo do fabricante';
}

// Fallback para adapters sem fetchFalhas (FoxESS/Growatt): usa
// currentFault do ultimo snapshot do inverter como "falha ativa" generica.
// O adapter Growatt grava um prefixo de severidade (F:/W:) pra permitir
// distinguir falha critica de simples aviso sem precisar da API dedicada.
async function fetchFalhasFallback(inverter) {
  const ultimo = await prisma.solarSnapshot.findFirst({
    where: { tenantId: inverter.tenantId, inverterId: inverter.id },
    orderBy: { capturedAt: 'desc' },
    select: { currentFault: true, capturedAt: true },
  });
  if (!ultimo?.currentFault) return [];

  const bruto = String(ultimo.currentFault);
  let severidade = 'desconhecida';
  let codigo = bruto;
  if (bruto.startsWith('F:')) { severidade = 'critica'; codigo = bruto.slice(2); }
  else if (bruto.startsWith('W:')) { severidade = 'atencao'; codigo = bruto.slice(2); }

  // Nivel do SIMEC: 1=critica (Telegram), 2=alarme (Telegram), 3=aviso (so sino)
  // Growatt critica vira nivel 1, Growatt atencao vira nivel 3. Providers
  // sem prefixo (FoxESS legado) continuam nivel 2 pra nao mudar comportamento.
  const nivel = severidade === 'critica' ? 1 : (severidade === 'atencao' ? 3 : 2);

  const app = appDoProvider(inverter.provider);
  const nome = severidade === 'critica'
    ? `Falha no inversor (codigo ${codigo})`
    : (severidade === 'atencao'
        ? `Aviso do inversor (codigo ${codigo})`
        : `Falha no inversor (codigo ${codigo})`);
  const descricao = severidade === 'atencao'
    ? `Aviso reportado pelo inversor. Verifique no aplicativo ${app} para mais detalhes.`
    : `Falha no inversor, verifique no aplicativo ${app} para mais detalhes.`;

  return [{
    codigoExterno: `fallback-${bruto}`,
    codigoTipo: severidade,
    nome: nome.slice(0, 100),
    descricao,
    nivel,
    codigoReason: codigo,
    reportadaEm: ultimo.capturedAt,
    rawPayload: null,
  }];
}

async function processarInverter(inverter) {
  const adapter = getAdapter(inverter.provider);
  const credential = decryptCredential(inverter.credentialCrypt);
  if (!credential) return { ok: false, erro: 'credencial-invalida' };

  let falhasAtivas = [];
  try {
    if (typeof adapter.fetchFalhas === 'function') {
      falhasAtivas = await adapter.fetchFalhas({
        ...inverter,
        credential,
      }) || [];
    } else {
      falhasAtivas = await fetchFalhasFallback(inverter);
    }
  } catch (err) {
    // Se precisa re-autorizar, o solar-poll ja vai tratar — aqui so loga
    if (err?.code === 'AUTHORIZATION_REQUIRED') return { ok: false, erro: 'nao-autorizado' };
    console.warn(`[SOLAR_FALHAS] Falha ao buscar falhas do inverter ${inverter.id}:`, err.message);
    return { ok: false, erro: err.message };
  }

  const plant = await prisma.solarPlant.findUnique({
    where: { id: inverter.plantId },
    include: { unidade: { select: { nomeSistema: true } } },
  });
  if (!plant) return { ok: false, erro: 'planta-nao-encontrada' };

  let criadas = 0, atualizadas = 0, resolvidas = 0;
  const agora = new Date();
  const codigosVistosAgora = new Set(falhasAtivas.map((f) => f.codigoExterno));

  // 1. Upsert das ativas
  for (const f of falhasAtivas) {
    const existente = await prisma.solarFalha.findUnique({
      where: {
        tenantId_inverterId_codigoExterno: {
          tenantId: inverter.tenantId,
          inverterId: inverter.id,
          codigoExterno: f.codigoExterno,
        },
      },
    });

    if (existente) {
      // Se estava resolvida e voltou: reabre
      const patch = { ultimaConfirmacaoEm: agora };
      if (existente.resolvidaEm) patch.resolvidaEm = null;
      await prisma.solarFalha.update({ where: { id: existente.id }, data: patch });
      atualizadas++;
    } else {
      const nova = await prisma.solarFalha.create({
        data: {
          tenantId: inverter.tenantId,
          plantId: inverter.plantId,
          inverterId: inverter.id,
          provider: inverter.provider,
          codigoExterno: f.codigoExterno,
          codigoTipo: f.codigoTipo,
          nome: f.nome,
          descricao: f.descricao,
          nivel: f.nivel,
          codigoReason: f.codigoReason,
          reportadaEm: f.reportadaEm || agora,
          ultimaConfirmacaoEm: agora,
          rawPayload: f.rawPayload || undefined,
        },
      });
      criadas++;
      await emitirAlertaFalha({ falha: nova, plant, tenantId: inverter.tenantId });
    }
  }

  // 2. Resolver falhas que pararam de aparecer ha >2h
  const limite = new Date(agora.getTime() - JANELA_SEM_CONFIRMACAO_MS);
  const paraResolver = await prisma.solarFalha.findMany({
    where: {
      tenantId: inverter.tenantId,
      inverterId: inverter.id,
      resolvidaEm: null,
      ultimaConfirmacaoEm: { lt: limite },
      NOT: { codigoExterno: { in: Array.from(codigosVistosAgora) } },
    },
  });
  for (const f of paraResolver) {
    await prisma.solarFalha.update({
      where: { id: f.id },
      data: { resolvidaEm: agora },
    });
    resolvidas++;
    await emitirAlertaResolvido({ falha: f, plant, tenantId: inverter.tenantId });
  }

  return { ok: true, criadas, atualizadas, resolvidas };
}

export async function processarFalhasSolar() {
  const inverters = await prisma.solarInverter.findMany({
    where: { ativo: true, plant: { ativo: true } },
    select: {
      id: true, tenantId: true, plantId: true, provider: true,
      apiBase: true, inverterSn: true, credentialCrypt: true,
    },
  });

  const tenantsAfetados = new Set();
  const resultados = [];
  for (const inv of inverters) {
    try {
      const r = await processarInverter(inv);
      resultados.push({ inverterId: inv.id, ...r });
      if (r.ok && (r.criadas > 0 || r.resolvidas > 0)) {
        tenantsAfetados.add(inv.tenantId);
      }
    } catch (err) {
      console.error(`[SOLAR_FALHAS] Erro inesperado no inverter ${inv.id}:`, err);
      resultados.push({ inverterId: inv.id, ok: false, erro: err.message });
    }
  }

  for (const tenantId of tenantsAfetados) {
    publicarContagemAlertasParaTenant({ tenantId }).catch(() => {});
  }

  return { total: inverters.length, resultados };
}
