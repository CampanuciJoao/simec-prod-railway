// Relatorios PDF de energia solar — Fase 4.
//
// Tres variantes compartilhando helpers (header, drawSecao, drawTabela):
//
//  1. gerarRelatorioSolarPdf         — mensal (ano+mes), mantido pra compat
//  2. gerarRelatorioProducaoPdf      — producao em periodo livre (data inicio/fim)
//                                      KPIs + geracao diaria + quedas
//  3. gerarRelatorioFalhasPdf        — falhas de inversor em periodo livre
//                                      (planta + opcionalmente 1 inverter)

import PDFDocument from 'pdfkit';
import prisma from '../prismaService.js';
import { resolverLogoSimec } from '../pdf/_pdfLogoHelper.js';
import { calcularAgregadoDoDia } from './solarAgregadosService.js';

const LOGO = resolverLogoSimec();
const C = {
  ink: '#1a1a1a',
  gray600: '#4b5563',
  gray400: '#9ca3af',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  white: '#ffffff',
  slate900: '#1e293b',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  blue: '#2563eb',
};

const MESES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const NIVEIS = { 1: 'Crítica', 2: 'Alarme', 3: 'Aviso', 4: 'Sugestão' };

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
function fmtPct(v) {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}
function fmtData(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Campo_Grande' });
}
function fmtDataHora(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande' });
}

function drawHeader(doc, { planta, unidade, periodoLabel, titulo }) {
  const W = doc.page.width;
  doc.save().rect(0, 24, W, 52).fill(C.slate900).restore();
  if (LOGO) {
    try { doc.image(LOGO, 12, 29, { fit: [42, 42] }); } catch {}
  }
  const tx = LOGO ? 60 : 14;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(C.white).text('SIMEC', tx, 34);
  doc.font('Helvetica').fontSize(7.5).fillColor('#cbd5e1')
    .text(titulo, tx, 54);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
    .text(planta, W - 220, 32, { width: 200, align: 'right' });
  doc.font('Helvetica').fontSize(8).fillColor('#cbd5e1')
    .text(unidade || '', W - 220, 46, { width: 200, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#e5e7eb')
    .text(periodoLabel, W - 220, 60, { width: 200, align: 'right' });
}

function drawSecao(doc, titulo, y) {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink).text(titulo, 40, y);
  doc.moveTo(40, y + 15).lineTo(doc.page.width - 40, y + 15).lineWidth(0.5).strokeColor(C.gray400).stroke();
  return y + 22;
}

function drawKpi(doc, { label, valor, sub, cor = C.ink }, x, y, w) {
  doc.rect(x, y, w, 56).lineWidth(0.5).strokeColor(C.gray200).stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor(C.gray600).text(label.toUpperCase(), x + 10, y + 8);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(cor).text(valor, x + 10, y + 20);
  if (sub) {
    doc.font('Helvetica').fontSize(7.5).fillColor(C.gray600).text(sub, x + 10, y + 42);
  }
}

function drawTabela(doc, { headers, rows, colWidths }, x, y) {
  const rowH = 16;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  doc.rect(x, y, totalW, rowH).fill(C.slate900);
  let cx = x;
  for (let i = 0; i < headers.length; i++) {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white)
      .text(headers[i], cx + 4, y + 5, { width: colWidths[i] - 8 });
    cx += colWidths[i];
  }
  let cy = y + rowH;
  for (const row of rows) {
    if (cy > doc.page.height - 60) {
      doc.addPage();
      cy = 100;
    }
    cx = x;
    doc.rect(cx, cy, totalW, rowH).lineWidth(0.3).strokeColor(C.gray200).stroke();
    for (let i = 0; i < row.length; i++) {
      doc.font('Helvetica').fontSize(8).fillColor(C.ink)
        .text(String(row[i] ?? ''), cx + 4, cy + 4, {
          width: colWidths[i] - 8,
          height: rowH - 4,
          ellipsis: true,
        });
      cx += colWidths[i];
    }
    cy += rowH;
  }
  return cy;
}

function drawRodape(doc) {
  const W = doc.page.width;
  const H = doc.page.height;
  doc.font('Helvetica').fontSize(7).fillColor(C.gray400)
    .text(`Gerado por SIMEC em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande' })}`,
      40, H - 30, { width: W - 80, align: 'center' });
}

// Itera dias de dataInicio ate dataFim (inclusivos, em UTC), calcula ou
// le o agregado de cada dia e devolve array ordenado.
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
      resultado.push({ dia: new Date(t), ...porDia.get(key), fonte: 'agregado' });
    } else {
      // Ainda nao fechado pelo cron — calcula ao vivo
      try {
        const vivo = await calcularAgregadoDoDia({ tenantId, plant, dia: new Date(t) });
        resultado.push({ dia: new Date(t), ...vivo, fonte: 'vivo' });
      } catch {
        resultado.push({ dia: new Date(t), kwhGerado: 0, fonte: 'erro' });
      }
    }
  }
  return resultado;
}

// ─── 1) PDF mensal (legado — mantido pra compat) ─────────────────────────────
export async function gerarRelatorioSolarPdf({ res, tenantId, plantId, ano, mes }) {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 0)); // ultimo dia do mes
  return gerarRelatorioProducaoPdf({
    res, tenantId, plantId,
    dataInicio: inicio.toISOString().slice(0, 10),
    dataFim: fim.toISOString().slice(0, 10),
    tituloExtra: `${MESES[mes]} / ${ano}`,
  });
}

// ─── 2) PDF de producao (periodo livre) ──────────────────────────────────────
export async function gerarRelatorioProducaoPdf({ res, tenantId, plantId, dataInicio, dataFim, tituloExtra }) {
  const plant = await prisma.solarPlant.findFirst({
    where: { id: plantId, tenantId },
    include: { unidade: { select: { nomeSistema: true } } },
  });
  if (!plant) { res.status(404).json({ error: 'Planta nao encontrada' }); return; }

  const inicio = new Date(dataInicio + 'T00:00:00.000Z');
  const fim = new Date(dataFim + 'T23:59:59.999Z');
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
    res.status(400).json({ error: 'Datas invalidas (dataInicio deve ser <= dataFim, formato YYYY-MM-DD)' });
    return;
  }

  const agregados = await construirAgregadosDoPeriodo({ tenantId, plant, dataInicio: inicio, dataFim: fim });
  const quedas = await prisma.solarOutage.findMany({
    where: { tenantId, plantId, inicioEm: { gte: inicio, lte: fim } },
    orderBy: { inicioEm: 'desc' },
    take: 100,
  });

  const soma = (campo) => agregados.reduce((acc, d) => acc + (d[campo] || 0), 0);
  const kwhGerado = soma('kwhGerado');
  const kwhExport = soma('kwhExportadoRede');
  const valorBrl = soma('valorEconomizadoBrl');
  const horasOffline = soma('horasOffline');
  const picos = agregados.map((d) => d.picosKw).filter((v) => v != null);
  const picoMax = picos.length ? Math.max(...picos) : null;
  const diasComGer = agregados.filter((d) => (d.kwhGerado || 0) > 0).length;

  const periodoLabel = tituloExtra || `${fmtData(inicio)} — ${fmtData(fim)}`;
  const nomeArquivo = `simec-solar-producao-${plant.nome.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${dataInicio}-a-${dataFim}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  drawHeader(doc, {
    planta: plant.nome, unidade: plant.unidade?.nomeSistema,
    periodoLabel, titulo: 'Relatório de produção solar',
  });

  let y = 100;
  const colW = (doc.page.width - 80 - 24) / 3;
  drawKpi(doc, {
    label: 'Energia gerada',
    valor: fmtKwh(kwhGerado),
    sub: `${agregados.length} dias no período`,
    cor: C.green,
  }, 40, y, colW);
  drawKpi(doc, {
    label: 'Economia estimada',
    valor: fmtBrl(valorBrl),
    sub: `Tarifa R$ ${(plant.tarifaKwh || 0.64).toFixed(2)}/kWh`,
    cor: C.green,
  }, 40 + colW + 12, y, colW);
  drawKpi(doc, {
    label: 'Pico de potência',
    valor: fmtKw(picoMax),
    sub: plant.capacidadeKwp ? `Capacidade: ${plant.capacidadeKwp} kWp` : null,
  }, 40 + 2 * (colW + 12), y, colW);

  y += 68;
  drawKpi(doc, {
    label: 'Dias com geração',
    valor: `${diasComGer} / ${agregados.length}`,
    sub: 'dias do período',
  }, 40, y, colW);
  drawKpi(doc, {
    label: 'Horas offline',
    valor: `${(horasOffline || 0).toFixed(1)} h`,
    sub: `${quedas.length} quedas`,
    cor: (horasOffline || 0) > 2 ? C.red : C.ink,
  }, 40 + colW + 12, y, colW);
  drawKpi(doc, {
    label: 'Exportado p/ rede',
    valor: fmtKwh(kwhExport),
    sub: 'kWh injetados',
  }, 40 + 2 * (colW + 12), y, colW);

  y += 80;
  y = drawSecao(doc, 'Geração diária', y);
  const linhas = agregados.map((d) => [
    fmtData(d.dia),
    d.kwhGerado != null ? `${d.kwhGerado.toFixed(1)}` : '—',
    d.picosKw != null ? `${d.picosKw.toFixed(2)}` : '—',
    d.valorEconomizadoBrl != null ? fmtBrl(d.valorEconomizadoBrl) : '—',
    d.falhasAbertas > 0 ? String(d.falhasAbertas) : '',
    d.horasOffline != null && d.horasOffline > 0 ? `${d.horasOffline.toFixed(1)} h` : '',
    d.fonte === 'vivo' ? '●' : '',
  ]);
  if (linhas.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.gray600)
      .text('Nenhum dia agregado no período.', 40, y);
    y += 20;
  } else {
    y = drawTabela(doc, {
      headers: ['Dia', 'kWh gerado', 'Pico kW', 'R$ economizado', 'Falhas', 'Offline', 'Ao vivo'],
      rows: linhas,
      colWidths: [80, 70, 65, 95, 45, 65, 50],
    }, 40, y);
  }

  if (plant.temBateria && quedas.length > 0) {
    y += 16;
    if (y > doc.page.height - 200) { doc.addPage(); y = 100; }
    y = drawSecao(doc, `Quedas de energia (${quedas.length})`, y);
    y = drawTabela(doc, {
      headers: ['Início', 'Fim', 'Duração', 'SoC inicial', 'SoC mínimo'],
      rows: quedas.map((q) => [
        fmtDataHora(q.inicioEm),
        q.fimEm ? fmtDataHora(q.fimEm) : 'Em andamento',
        q.duracaoMin ? `${q.duracaoMin} min` : '—',
        q.socInicial != null ? `${q.socInicial.toFixed(0)}%` : '—',
        q.socMinimo != null ? `${q.socMinimo.toFixed(0)}%` : '—',
      ]),
      colWidths: [110, 110, 70, 90, 90],
    }, 40, y);
  }

  doc.font('Helvetica-Oblique').fontSize(7).fillColor(C.gray400)
    .text('● = dia calculado ao vivo (ainda não fechado pelo cron diário)', 40, doc.page.height - 45);
  drawRodape(doc);
  doc.end();
}

// ─── 3) PDF de falhas de inversor (periodo livre) ────────────────────────────
export async function gerarRelatorioFalhasPdf({ res, tenantId, plantId, dataInicio, dataFim, inverterId }) {
  const plant = await prisma.solarPlant.findFirst({
    where: { id: plantId, tenantId },
    include: {
      unidade: { select: { nomeSistema: true } },
      inverters: { select: { id: true, inverterSn: true, modeloInversor: true, provider: true } },
    },
  });
  if (!plant) { res.status(404).json({ error: 'Planta nao encontrada' }); return; }

  const inicio = new Date(dataInicio + 'T00:00:00.000Z');
  const fim = new Date(dataFim + 'T23:59:59.999Z');
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
    res.status(400).json({ error: 'Datas invalidas' });
    return;
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
  const subtituloInversor = inverterFiltrado
    ? ` · Inversor: ${inverterFiltrado.provider} SN ${inverterFiltrado.inverterSn}`
    : ` · Todos inversores`;

  const periodoLabel = `${fmtData(inicio)} — ${fmtData(fim)}${subtituloInversor}`;
  const invSlug = inverterFiltrado ? `-${inverterFiltrado.inverterSn.toLowerCase()}` : '';
  const nomeArquivo = `simec-solar-falhas-${plant.nome.replace(/[^a-z0-9]/gi, '-').toLowerCase()}${invSlug}-${dataInicio}-a-${dataFim}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  drawHeader(doc, {
    planta: plant.nome, unidade: plant.unidade?.nomeSistema,
    periodoLabel, titulo: 'Relatório de falhas de inversor',
  });

  let y = 100;
  const colW = (doc.page.width - 80 - 36) / 4;
  drawKpi(doc, { label: 'Total', valor: String(falhas.length), sub: 'falhas no período' }, 40, y, colW);
  drawKpi(doc, { label: 'Críticas', valor: String(porNivel[1] || 0), cor: C.red, sub: 'nível 1 (fault)' }, 40 + colW + 12, y, colW);
  drawKpi(doc, { label: 'Alarmes', valor: String(porNivel[2] || 0), cor: C.amber, sub: 'nível 2 (alarm)' }, 40 + 2 * (colW + 12), y, colW);
  drawKpi(doc, { label: 'Resolvidas', valor: String(resolvidas), cor: C.green, sub: `${falhas.length - resolvidas} ainda abertas` }, 40 + 3 * (colW + 12), y, colW);

  y += 80;
  y = drawSecao(doc, `Falhas registradas (${falhas.length})`, y);

  if (falhas.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.gray600)
      .text('Nenhuma falha registrada no período.', 40, y);
  } else {
    const rows = falhas.map((f) => [
      fmtDataHora(f.reportadaEm),
      NIVEIS[f.nivel] || '-',
      f.inverter?.inverterSn || '-',
      f.nome,
      f.resolvidaEm ? `Resolvida ${fmtData(f.resolvidaEm)}` : 'Aberta',
    ]);
    y = drawTabela(doc, {
      headers: ['Data/Hora', 'Nível', 'SN Inversor', 'Nome da falha', 'Status'],
      rows,
      colWidths: [110, 55, 90, 170, 90],
    }, 40, y);
  }

  drawRodape(doc);
  doc.end();
}
