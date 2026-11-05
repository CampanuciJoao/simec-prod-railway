// Relatorio PDF mensal de energia solar — Fase 4.
//
// Streaming direto pro res. Conteudo:
//   - Capa: logo SIMEC, nome da planta, unidade, mes/ano
//   - Resumo: kWh gerado, valor economizado, pico, PR medio, variacao vs mes anterior
//   - Tabela de geracao diaria (um bloco de 10 dias por secao)
//   - Lista de falhas do mes (com data, nivel, nome)
//   - Lista de quedas do mes (so plantas com bateria)
//   - Rodape: "Gerado por SIMEC em <timestamp>"
//
// Padrao visual: segue orcamentoPdfService (preto/branco minimalista,
// faixa escura no topo, tipografia Helvetica).

import PDFDocument from 'pdfkit';
import prisma from '../prismaService.js';
import { resolverLogoSimec } from '../pdf/_pdfLogoHelper.js';

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

function drawHeader(doc, { planta, unidade, ano, mes }) {
  const W = doc.page.width;
  doc.save().rect(0, 24, W, 52).fill(C.slate900).restore();
  if (LOGO) {
    try { doc.image(LOGO, 12, 29, { fit: [42, 42] }); } catch {}
  }
  const tx = LOGO ? 60 : 14;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(C.white).text('SIMEC', tx, 34);
  doc.font('Helvetica').fontSize(7.5).fillColor('#cbd5e1')
    .text('Relatório mensal de energia solar', tx, 54);
  // Direita: planta + periodo
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
    .text(planta, W - 220, 32, { width: 200, align: 'right' });
  doc.font('Helvetica').fontSize(8).fillColor('#cbd5e1')
    .text(unidade || '', W - 220, 46, { width: 200, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#e5e7eb')
    .text(`${MESES[mes]} / ${ano}`, W - 220, 60, { width: 200, align: 'right' });
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
  // Header
  doc.rect(x, y, totalW, rowH).fill(C.slate900);
  let cx = x;
  for (let i = 0; i < headers.length; i++) {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white)
      .text(headers[i], cx + 4, y + 5, { width: colWidths[i] - 8 });
    cx += colWidths[i];
  }
  // Rows
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

export async function gerarRelatorioSolarPdf({ res, tenantId, plantId, ano, mes }) {
  const plant = await prisma.solarPlant.findFirst({
    where: { id: plantId, tenantId },
    include: { unidade: { select: { nomeSistema: true } } },
  });
  if (!plant) {
    res.status(404).json({ error: 'Planta nao encontrada' });
    return;
  }

  const mensal = await prisma.solarAgregadoMensal.findUnique({
    where: { tenantId_plantId_ano_mes: { tenantId, plantId, ano, mes } },
  });
  if (!mensal) {
    res.status(404).json({ error: `Ainda nao ha dados agregados para ${MESES[mes]}/${ano}. Relatorio e gerado apos o fechamento diario (02:30 UTC).` });
    return;
  }

  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));
  const [diarios, falhas, quedas] = await Promise.all([
    prisma.solarAgregadoDiario.findMany({
      where: { tenantId, plantId, dia: { gte: inicio, lt: fim } },
      orderBy: { dia: 'asc' },
    }),
    prisma.solarFalha.findMany({
      where: { tenantId, plantId, reportadaEm: { gte: inicio, lt: fim } },
      orderBy: { reportadaEm: 'desc' },
      take: 50,
    }),
    prisma.solarOutage.findMany({
      where: { tenantId, plantId, inicioEm: { gte: inicio, lt: fim } },
      orderBy: { inicioEm: 'desc' },
      take: 50,
    }),
  ]);

  const nomeArquivo = `simec-solar-${plant.nome.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${ano}-${String(mes).padStart(2, '0')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  drawHeader(doc, { planta: plant.nome, unidade: plant.unidade?.nomeSistema, ano, mes });

  // KPIs principais
  let y = 100;
  const colW = (doc.page.width - 80 - 24) / 3;
  const variacao = mensal.variacaoKwhMesAnterior;
  const corVar = variacao == null ? C.ink : variacao >= 0 ? C.green : C.red;
  const sinal = variacao == null ? '' : variacao >= 0 ? '+' : '';
  drawKpi(doc, {
    label: 'Energia gerada',
    valor: fmtKwh(mensal.kwhGerado),
    sub: variacao != null ? `${sinal}${fmtPct(variacao)} vs mês anterior` : 'Sem histórico anterior',
    cor: corVar,
  }, 40, y, colW);
  drawKpi(doc, {
    label: 'Economia estimada',
    valor: fmtBrl(mensal.valorEconomizadoBrl),
    sub: `Tarifa R$ ${(plant.tarifaKwh || 0.64).toFixed(2)}/kWh`,
    cor: C.green,
  }, 40 + colW + 12, y, colW);
  drawKpi(doc, {
    label: 'Pico de potência',
    valor: fmtKw(mensal.picosKw),
    sub: plant.capacidadeKwp ? `Capacidade instalada: ${plant.capacidadeKwp} kWp` : null,
  }, 40 + 2 * (colW + 12), y, colW);

  y += 68;
  // Segunda linha KPI
  drawKpi(doc, {
    label: 'Dias com geração',
    valor: `${mensal.diasComGeracao || 0} / ${new Date(Date.UTC(ano, mes, 0)).getUTCDate()}`,
    sub: 'dias do mês',
  }, 40, y, colW);
  drawKpi(doc, {
    label: 'Horas offline',
    valor: `${(mensal.horasOffline || 0).toFixed(1)} h`,
    sub: `${mensal.quedasTotal} quedas, ${mensal.falhasTotal} falhas`,
    cor: (mensal.horasOffline || 0) > 2 ? C.red : C.ink,
  }, 40 + colW + 12, y, colW);
  drawKpi(doc, {
    label: 'PR médio',
    valor: mensal.prAproxMedio != null ? fmtPct(mensal.prAproxMedio) : '—',
    sub: 'Performance ratio aprox.',
  }, 40 + 2 * (colW + 12), y, colW);

  y += 80;

  // Tabela de geracao diaria
  y = drawSecao(doc, 'Geração diária', y);
  const linhasDiarias = diarios.map((d) => [
    fmtData(d.dia),
    d.kwhGerado != null ? `${d.kwhGerado.toFixed(1)}` : '—',
    d.picosKw != null ? `${d.picosKw.toFixed(2)}` : '—',
    d.valorEconomizadoBrl != null ? fmtBrl(d.valorEconomizadoBrl) : '—',
    d.falhasAbertas > 0 ? String(d.falhasAbertas) : '',
    d.horasOffline != null && d.horasOffline > 0 ? `${d.horasOffline.toFixed(1)} h` : '',
  ]);
  if (linhasDiarias.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.gray600)
      .text('Nenhum dia agregado no período.', 40, y);
    y += 20;
  } else {
    y = drawTabela(doc, {
      headers: ['Dia', 'kWh gerado', 'Pico kW', 'R$ economizado', 'Falhas', 'Offline'],
      rows: linhasDiarias,
      colWidths: [80, 70, 70, 100, 50, 80],
    }, 40, y);
  }

  // Falhas
  y += 16;
  if (y > doc.page.height - 200) { doc.addPage(); y = 100; }
  y = drawSecao(doc, `Falhas registradas no mês (${falhas.length})`, y);
  if (falhas.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.gray600)
      .text('Nenhuma falha registrada.', 40, y);
    y += 20;
  } else {
    y = drawTabela(doc, {
      headers: ['Data', 'Nível', 'Nome', 'Status'],
      rows: falhas.slice(0, 20).map((f) => [
        fmtData(f.reportadaEm),
        NIVEIS[f.nivel] || '-',
        f.nome,
        f.resolvidaEm ? `Resolvida ${fmtData(f.resolvidaEm)}` : 'Aberta',
      ]),
      colWidths: [80, 70, 240, 130],
    }, 40, y);
  }

  // Quedas de energia (plantas com bateria)
  if (plant.temBateria) {
    y += 16;
    if (y > doc.page.height - 200) { doc.addPage(); y = 100; }
    y = drawSecao(doc, `Quedas de energia (${quedas.length})`, y);
    if (quedas.length === 0) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.gray600)
        .text('Nenhuma queda registrada.', 40, y);
      y += 20;
    } else {
      y = drawTabela(doc, {
        headers: ['Início', 'Fim', 'Duração', 'SoC inicial', 'SoC mínimo'],
        rows: quedas.map((q) => [
          fmtData(q.inicioEm),
          q.fimEm ? fmtData(q.fimEm) : 'Em andamento',
          q.duracaoMin ? `${q.duracaoMin} min` : '—',
          q.socInicial != null ? `${q.socInicial.toFixed(0)}%` : '—',
          q.socMinimo != null ? `${q.socMinimo.toFixed(0)}%` : '—',
        ]),
        colWidths: [100, 100, 80, 90, 90],
      }, 40, y);
    }
  }

  drawRodape(doc);
  doc.end();
}
