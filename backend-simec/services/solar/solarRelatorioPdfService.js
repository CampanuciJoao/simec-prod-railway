// Relatorios PDF de energia solar — segue o padrao SIMEC reutilizando
// os helpers do pdfDocumentService (createDocument, finalizeDocument,
// drawSectionTitle, drawTable, drawKpiCards, drawEntidadeInfoBlock).
// O resultado tem layout 100% identico aos relatorios de Inventario /
// Manutencoes / Historico de equipamento.
//
// Tres variantes:
//   1. gerarRelatorioSolarPdf     — mensal (legado, mantido pra compat)
//   2. gerarRelatorioProducaoPdf  — producao em periodo livre
//   3. gerarRelatorioFalhasPdf    — falhas de inversor em periodo livre

import prisma from '../prismaService.js';
import {
  createDocument, finalizeDocument,
  drawSectionTitle, drawTable, drawKpiCards,
  injectTenantInfo, safeText,
} from '../pdf/pdfDocumentService.js';
import { drawEntidadeInfoBlock } from '../pdf/_pdfLogoHelper.js';
import { calcularAgregadoDoDia } from './solarAgregadosService.js';

// Cores do padrao pdfDocumentService (COLORS)
const COR_SUCCESS = '#16a34a';
const COR_DANGER  = '#dc2626';
const COR_WARNING = '#f59e0b';
const COR_INFO    = '#2563eb';

const NIVEIS = { 1: 'Crítica', 2: 'Alarme', 3: 'Aviso', 4: 'Sugestão' };

// ─── Formatters ─────────────────────────────────────────────────────────────
function fmtKwh(v) {
  if (v == null) return '—';
  return `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`;
}
function fmtBrl(v) {
  if (v == null) return '—';
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtKw(v) {
  if (v == null) return '—';
  return `${Number(v).toFixed(2)} kW`;
}
function fmtData(d, timeZone = 'America/Campo_Grande') {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone });
}
function fmtDataHora(d, timeZone = 'America/Campo_Grande') {
  if (!d) return '';
  return new Date(d).toLocaleString('pt-BR', { timeZone });
}

// Itera dias de dataInicio ate dataFim (inclusivos, UTC), usando
// SolarAgregadoDiario pro dia ja fechado e calculando ao vivo pro resto.
async function construirAgregadosDoPeriodo({ tenantId, plant, dataInicio, dataFim }) {
  const diarios = await prisma.solarAgregadoDiario.findMany({
    where: { tenantId, plantId: plant.id, dia: { gte: dataInicio, lte: dataFim } },
    orderBy: { dia: 'asc' },
  });
  const porDia = new Map(diarios.map((d) => [d.dia.toISOString().slice(0, 10), d]));

  const resultado = [];
  for (let t = new Date(dataInicio); t <= dataFim; t.setUTCDate(t.getUTCDate() + 1)) {
    const key = t.toISOString().slice(0, 10);
    if (porDia.has(key)) {
      resultado.push({ dia: new Date(t), ...porDia.get(key) });
    } else {
      try {
        const vivo = await calcularAgregadoDoDia({ tenantId, plant, dia: new Date(t) });
        resultado.push({ dia: new Date(t), ...vivo });
      } catch {
        resultado.push({ dia: new Date(t), kwhGerado: 0 });
      }
    }
  }
  return resultado;
}

// ─── 1) PDF mensal (legado — aponta pra producao com periodo = mes) ─────────
// Retorna: { buffer, fileName }
export async function gerarRelatorioSolarPdf({ tenantId, plantId, ano, mes }) {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 0));
  return gerarRelatorioProducaoPdf({
    tenantId, plantId,
    dataInicio: inicio.toISOString().slice(0, 10),
    dataFim: fim.toISOString().slice(0, 10),
  });
}

// ─── 2) PDF de producao (periodo livre) ─────────────────────────────────────
// Retorna: { buffer, fileName } ou lanca erro com .status/.message pra
// mapErrorToResponse tratar na rota.
export async function gerarRelatorioProducaoPdf({ tenantId, plantId, dataInicio, dataFim }) {
  const plant = await prisma.solarPlant.findFirst({
    where: { id: plantId, tenantId },
    include: { unidade: { select: { id: true, nomeSistema: true } } },
  });
  if (!plant) {
    const err = new Error('Planta nao encontrada'); err.status = 404; throw err;
  }

  const inicio = new Date(dataInicio + 'T00:00:00.000Z');
  const fim = new Date(dataFim + 'T23:59:59.999Z');
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
    const err = new Error('Datas invalidas (dataInicio <= dataFim, formato YYYY-MM-DD)');
    err.status = 400; throw err;
  }

  const [agregados, quedas] = await Promise.all([
    construirAgregadosDoPeriodo({ tenantId, plant, dataInicio: inicio, dataFim: fim }),
    prisma.solarOutage.findMany({
      where: { tenantId, plantId, inicioEm: { gte: inicio, lte: fim } },
      orderBy: { inicioEm: 'desc' },
      take: 100,
    }),
  ]);

  const soma = (campo) => agregados.reduce((acc, d) => acc + (d[campo] || 0), 0);
  const kwhGerado = soma('kwhGerado');
  const kwhExport = soma('kwhExportadoRede');
  const valorBrl = soma('valorEconomizadoBrl');
  const horasOffline = soma('horasOffline');
  const picos = agregados.map((d) => d.picosKw).filter((v) => v != null);
  const picoMax = picos.length ? Math.max(...picos) : null;
  const diasComGer = agregados.filter((d) => (d.kwhGerado || 0) > 0).length;

  // Options com tenantInfo pre-injetado
  const options = await injectTenantInfo(
    { tenantId, unidadeId: plant.unidade?.id, tenantIdFallback: tenantId },
    {},
  );

  const fileName = `relatorio_producao_solar_${plant.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dataInicio}_a_${dataFim}.pdf`;

  // createDocument ja faz header SIMEC padrao, numera paginas etc
  const doc = createDocument('RELATÓRIO DE PRODUÇÃO SOLAR', options);

  // Bloco "Dados da Empresa" (tenant/unidade)
  drawEntidadeInfoBlock(doc, options?.tenantInfo);

  // Contexto do relatorio
  drawSectionTitle(doc, 'Dados da planta e período');
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b')
    .text(plant.nome, doc.page.margins.left, doc.y);
  doc.font('Helvetica').fontSize(9).fillColor('#475569')
    .text(`Período: ${fmtData(inicio)} até ${fmtData(fim)}  ·  ${agregados.length} dia(s) analisados`,
      doc.page.margins.left, doc.y + 2);
  if (plant.capacidadeKwp) {
    doc.text(`Capacidade instalada: ${plant.capacidadeKwp} kWp  ·  Tarifa: R$ ${(plant.tarifaKwh || 0.64).toFixed(2)}/kWh`,
      doc.page.margins.left, doc.y + 2);
  }
  doc.y += 16;

  // KPIs — 2 colunas (padrao drawKpiCards)
  drawKpiCards(doc, [
    { value: fmtKwh(kwhGerado),        label: 'Energia gerada',    color: COR_SUCCESS, desc: `${agregados.length} dias no período` },
    { value: fmtBrl(valorBrl),         label: 'Economia estimada', color: COR_SUCCESS, desc: `Tarifa R$ ${(plant.tarifaKwh || 0.64).toFixed(2)}/kWh` },
    { value: fmtKw(picoMax),           label: 'Pico de potência',  color: COR_INFO,    desc: plant.capacidadeKwp ? `Capacidade: ${plant.capacidadeKwp} kWp` : '—' },
    { value: `${diasComGer}/${agregados.length}`, label: 'Dias com geração', color: COR_INFO, desc: 'dias do período' },
    { value: `${(horasOffline || 0).toFixed(1)} h`, label: 'Horas offline',  color: (horasOffline || 0) > 2 ? COR_DANGER : COR_INFO, desc: `${quedas.length} queda(s)` },
    { value: fmtKwh(kwhExport),        label: 'Exportado p/ rede', color: COR_INFO, desc: 'kWh injetados na rede' },
  ]);

  // Tabela de geracao diaria
  drawSectionTitle(doc, 'Geração diária');
  drawTable(doc, {
    headers: ['Dia', 'kWh gerado', 'Pico (kW)', 'R$ economizado', 'Falhas', 'Offline'],
    columnWidths: [85, 75, 70, 100, 55, 70],
    rows: agregados.map((d) => [
      fmtData(d.dia),
      d.kwhGerado != null ? d.kwhGerado.toFixed(1) : '—',
      d.picosKw != null ? d.picosKw.toFixed(2) : '—',
      d.valorEconomizadoBrl != null ? fmtBrl(d.valorEconomizadoBrl) : '—',
      d.falhasAbertas > 0 ? String(d.falhasAbertas) : '—',
      d.horasOffline != null && d.horasOffline > 0 ? `${d.horasOffline.toFixed(1)} h` : '—',
    ]),
    emptyMessage: 'Nenhum dia agregado no período.',
  });

  // Quedas de energia — so planta com bateria
  if (plant.temBateria && quedas.length > 0) {
    drawSectionTitle(doc, `Quedas de energia (${quedas.length})`);
    drawTable(doc, {
      headers: ['Início', 'Fim', 'Duração', 'SoC inicial', 'SoC mínimo'],
      columnWidths: [120, 120, 80, 90, 85],
      rows: quedas.map((q) => [
        fmtDataHora(q.inicioEm),
        q.fimEm ? fmtDataHora(q.fimEm) : 'Em andamento',
        q.duracaoMin ? `${q.duracaoMin} min` : '—',
        q.socInicial != null ? `${q.socInicial.toFixed(0)}%` : '—',
        q.socMinimo != null ? `${q.socMinimo.toFixed(0)}%` : '—',
      ]),
    });
  }

  // finalizeDocument coleta chunks e retorna Buffer (padrao SIMEC)
  const buffer = await finalizeDocument(doc, { showSignature: false });
  return { buffer, fileName };
}

// ─── 3) PDF de falhas de inversor (periodo livre) ───────────────────────────
// Retorna: { buffer, fileName } ou lanca erro com .status
export async function gerarRelatorioFalhasPdf({ tenantId, plantId, dataInicio, dataFim, inverterId }) {
  const plant = await prisma.solarPlant.findFirst({
    where: { id: plantId, tenantId },
    include: {
      unidade: { select: { id: true, nomeSistema: true } },
      inverters: { select: { id: true, inverterSn: true, modeloInversor: true, provider: true } },
    },
  });
  if (!plant) {
    const err = new Error('Planta nao encontrada'); err.status = 404; throw err;
  }

  const inicio = new Date(dataInicio + 'T00:00:00.000Z');
  const fim = new Date(dataFim + 'T23:59:59.999Z');
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
    const err = new Error('Datas invalidas'); err.status = 400; throw err;
  }

  const where = {
    tenantId, plantId,
    reportadaEm: { gte: inicio, lte: fim },
    ...(inverterId ? { inverterId } : {}),
  };
  const falhas = await prisma.solarFalha.findMany({
    where,
    orderBy: { reportadaEm: 'desc' },
    include: { inverter: { select: { inverterSn: true, modeloInversor: true, provider: true } } },
    take: 500,
  });

  const porNivel = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let resolvidas = 0;
  for (const f of falhas) {
    porNivel[f.nivel] = (porNivel[f.nivel] || 0) + 1;
    if (f.resolvidaEm) resolvidas++;
  }

  const inverterFiltrado = inverterId
    ? plant.inverters.find((i) => i.id === inverterId)
    : null;

  const options = await injectTenantInfo(
    { tenantId, unidadeId: plant.unidade?.id, tenantIdFallback: tenantId },
    {},
  );

  const invSlug = inverterFiltrado ? `_${inverterFiltrado.inverterSn.toLowerCase()}` : '';
  const fileName = `relatorio_falhas_solar_${plant.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${invSlug}_${dataInicio}_a_${dataFim}.pdf`;

  const doc = createDocument('RELATÓRIO DE FALHAS DE INVERSOR', options);

  drawEntidadeInfoBlock(doc, options?.tenantInfo);

  drawSectionTitle(doc, 'Dados da planta e período');
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b')
    .text(plant.nome, doc.page.margins.left, doc.y);
  const infoSub = inverterFiltrado
    ? `Inversor: ${inverterFiltrado.provider} · SN ${inverterFiltrado.inverterSn}${inverterFiltrado.modeloInversor ? ' · ' + inverterFiltrado.modeloInversor : ''}`
    : `Todos os inversores da planta (${plant.inverters.length})`;
  doc.font('Helvetica').fontSize(9).fillColor('#475569')
    .text(`Período: ${fmtData(inicio)} até ${fmtData(fim)}`, doc.page.margins.left, doc.y + 2);
  doc.text(infoSub, doc.page.margins.left, doc.y + 2);
  doc.y += 16;

  drawKpiCards(doc, [
    { value: String(falhas.length),       label: 'Total de falhas', color: COR_INFO,    desc: 'no período' },
    { value: String(porNivel[1] || 0),    label: 'Críticas (nível 1)', color: COR_DANGER, desc: 'fault' },
    { value: String(porNivel[2] || 0),    label: 'Alarmes (nível 2)',  color: COR_WARNING, desc: 'alarm' },
    { value: String(resolvidas),          label: 'Resolvidas',         color: COR_SUCCESS, desc: `${falhas.length - resolvidas} ainda aberta(s)` },
  ]);

  drawSectionTitle(doc, `Falhas registradas (${falhas.length})`);
  drawTable(doc, {
    headers: ['Data/Hora', 'Nível', 'SN Inversor', 'Nome da falha', 'Status'],
    columnWidths: [110, 55, 90, 170, 90],
    rows: falhas.map((f) => [
      fmtDataHora(f.reportadaEm),
      NIVEIS[f.nivel] || '-',
      safeText(f.inverter?.inverterSn),
      safeText(f.nome),
      f.resolvidaEm ? `Resolvida ${fmtData(f.resolvidaEm)}` : 'Aberta',
    ]),
    emptyMessage: 'Nenhuma falha registrada no período.',
  });

  const buffer = await finalizeDocument(doc, { showSignature: false });
  return { buffer, fileName };
}
