import PDFDocument from 'pdfkit';
import {
  resolverLogoSimec,
  prepararEntidadeInfo,
  drawEntidadeInfoBlock,
} from './_pdfLogoHelper.js';

const LOGO_SIMEC = resolverLogoSimec();

const COLORS = {
  slate900: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  white: '#ffffff',
  blue: '#2563eb',
  slate400: '#94a3b8',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
};

function formatDate(value, locale = 'pt-BR', timeZone = 'UTC') {
  if (!value) return 'N/A';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

function formatDateTime(value, locale = 'pt-BR', timeZone = 'UTC') {
  if (!value) return 'N/A';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function safeText(value, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
}

function getMaxY(doc) {
  return doc.page.height - doc.page.margins.bottom - 24;
}

// Prepara informações da entidade exibida no bloco "Dados da Empresa":
// Unidade quando há unidadeId disponível (CNPJ + endereço fiscal),
// senão fallback no Tenant (só nome + contatos da conta). Idempotente.
async function injectTenantInfo(payload, options = {}) {
  if (options.tenantInfo) return options;

  const unidadeId =
    options.unidadeId ||
    payload?.unidadeId ||
    payload?.unidade?.id ||
    payload?.equipamento?.unidadeId ||
    payload?.equipamento?.unidade?.id ||
    payload?.manutencao?.equipamento?.unidadeId ||
    payload?.manutencao?.unidadeId ||
    payload?.contrato?.unidadeId ||
    payload?.os?.equipamento?.unidadeId ||
    null;

  const tenantId =
    options.tenantId ||
    payload?.tenantId ||
    payload?.equipamento?.tenantId ||
    payload?.contrato?.tenantId ||
    payload?.manutencao?.tenantId ||
    null;

  options.tenantInfo = await prepararEntidadeInfo({ unidadeId, tenantId });
  return options;
}

function drawHeader(doc, title, options = {}) {
  const { locale, timeZone } = options;
  const pageWidth = doc.page.width;
  const bandH = 52;

  doc.save().rect(0, 0, pageWidth, bandH).fill(COLORS.slate900).restore();

  const hasLogo = !!LOGO_SIMEC;
  if (hasLogo) {
    try {
      doc.image(LOGO_SIMEC, 12, 5, { fit: [42, 42] });
    } catch (err) {
      console.warn('[PDF_HEADER] Falha ao renderizar logo SIMEC:', err.message);
    }
  }

  const textX = hasLogo ? 60 : 14;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.white).text('SIMEC', textX, 10);
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(COLORS.slate300)
    .text('Sistema de Gestão de Equipamentos de Radiologia', textX, 30);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.slate300)
    .text(`Gerado em: ${formatDateTime(new Date(), locale, timeZone)}`, 0, 20, {
      align: 'right',
      width: pageWidth - 14,
      lineBreak: false,
    });

  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(COLORS.slate900)
    .text(title, 50, bandH + 12, { align: 'center', width: pageWidth - 100 });

  const sepY = bandH + 38;
  doc.moveTo(50, sepY).lineTo(pageWidth - 50, sepY).lineWidth(1).strokeColor(COLORS.slate300).stroke();

  doc.y = sepY + 14;
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const W = doc.page.width;

    if (i === range.count - 1) {
      const sigY = doc.page.height - doc.page.margins.bottom - 52;
      doc.moveTo(100, sigY).lineTo(W - 100, sigY).lineWidth(0.8).strokeColor(COLORS.slate300).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.slate500)
        .text('Assinatura do Responsável Técnico', 100, sigY + 5, { align: 'center', width: W - 200 });
    }

    const fy = doc.page.height - doc.page.margins.bottom - 10;
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.slate500)
      .text(`Página ${i + 1} de ${range.count}`, 50, fy, { align: 'right', width: W - 100 });
  }

  doc.switchToPage(range.start + range.count - 1);
  doc.y = doc.page.margins.top;
}

function createDocument(title, options = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 110, bottom: 48, left: 50, right: 50 },
    bufferPages: true,
  });

  doc.info.Title = title;

  drawHeader(doc, title, options);
  doc.on('pageAdded', () => {
    drawHeader(doc, title, options);
  });

  return doc;
}

function finalizeDocument(doc) {
  drawFooter(doc);

  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function ensureSpace(doc, neededHeight = 32) {
  if (doc.y + neededHeight <= getMaxY(doc)) {
    return;
  }

  doc.addPage();
}

function drawGroupHeader(doc, title, rightText = null) {
  ensureSpace(doc, 80);

  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;

  doc.save().rect(x, y, 3, 18).fill(COLORS.blue).restore();
  doc.save().rect(x + 3, y, w - 3, 18).fill(COLORS.slate100).restore();

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.slate700)
    .text(title, x + 12, y + 5, { lineBreak: false });

  if (rightText) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.slate500)
      .text(rightText, x + 12, y + 6, { width: w - 24, align: 'right', lineBreak: false });
  }

  doc.y = y + 24;
}

// Desenha um titulo de secao. Quando o caller sabe que o conteudo
// abaixo tem altura minima conhecida (ex: tabela com header + 1 row),
// passar { minContentBelow: N } pra garantir que o titulo nao fique
// orfa no fim da pagina enquanto o conteudo vai pra proxima.
function drawSectionTitle(doc, title, opts = {}) {
  const minContentBelow = Math.max(0, Number(opts?.minContentBelow) || 0);
  ensureSpace(doc, 60 + minContentBelow);
  doc.moveDown(0.8);
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;

  doc.save().rect(x, y, w, 18).fill(COLORS.slate100).restore();

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate700)
    .text(title, x + 4, y + 4);

  doc.y = y + 22;
}

function infoRow(doc, label, value) {
  ensureSpace(doc, 12);
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.slate500)
    .text(`${label}:`, 54, y, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.slate700)
    .text(` ${safeText(value)}`, { lineBreak: false });
  doc.y = y + 11;
}

function drawInfoGrid(doc, items = [], columns = 2) {
  const gap = 18;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidth = (totalWidth - gap * (columns - 1)) / columns;
  const topY = doc.y;
  let maxBottom = topY;

  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = doc.page.margins.left + column * (columnWidth + gap);
    const y = topY + row * 38;

    ensureSpace(doc, 46);

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.slate500)
      .text(item.label, x, y, {
        width: columnWidth,
      });

    const valueHeight = doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.slate900)
      .heightOfString(safeText(item.value), {
        width: columnWidth,
      });

    doc.text(safeText(item.value), x, y + 12, {
      width: columnWidth,
    });

    maxBottom = Math.max(maxBottom, y + 12 + valueHeight);
  });

  doc.y = maxBottom + 12;
}

function drawParagraph(doc, text) {
  ensureSpace(doc, 40);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COLORS.slate700)
    .text(safeText(text, '-'), 50, doc.y, {
      width: doc.page.width - 100,
      align: 'left',
    });
  doc.moveDown(0.8);
}

function drawTable(doc, { headers, rows, columnWidths, emptyMessage = 'Nenhum registro encontrado.' }) {
  const tableX = doc.page.margins.left;
  const headerHeight = 24;
  const paddingX = 6;
  const paddingY = 6;

  const renderHeader = () => {
    ensureSpace(doc, headerHeight + 10);

    let currentX = tableX;
    const y = doc.y;

    headers.forEach((header, index) => {
      const width = columnWidths[index];

      doc
        .save()
        .rect(currentX, y, width, headerHeight)
        .fillAndStroke(COLORS.slate900, COLORS.slate300)
        .restore();

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(COLORS.white)
        .text(header, currentX + paddingX, y + 7, {
          width: width - paddingX * 2,
          align: 'center',
        });

      currentX += width;
    });

    doc.y = y + headerHeight;
  };

  const normalizedRows =
    Array.isArray(rows) && rows.length
      ? rows
      : [[emptyMessage, ...new Array(Math.max(0, headers.length - 1)).fill('')]];

  renderHeader();

  normalizedRows.forEach((row, rowIndex) => {
    const cells = headers.map((_, index) => safeText(row[index] ?? '-'));

    // Calcula altura usando exatamente a mesma fonte/tamanho do render da
    // celula (Helvetica 9). Sem isso, heightOfString herdava o estado
    // anterior (Helvetica-Bold 8 do header) e subdimensionava — texto
    // vazava da celula ("Bomba Injetora de Contraste" virava "Bomba
    // Injetora de", "Desativado" virava "Desativad o").
    doc.font('Helvetica').fontSize(9);
    const heights = cells.map((cell, index) =>
      doc.heightOfString(cell, {
        width: columnWidths[index] - paddingX * 2,
        align: 'left',
      })
    );

    const rowHeight = Math.max(...heights, 14) + paddingY * 2;

    if (doc.y + rowHeight > getMaxY(doc)) {
      doc.addPage();
      renderHeader();
    }

    let currentX = tableX;
    const y = doc.y;

    cells.forEach((cell, index) => {
      const width = columnWidths[index];

      doc
        .save()
        .rect(currentX, y, width, rowHeight)
        .fillAndStroke(rowIndex % 2 === 0 ? COLORS.white : COLORS.slate100, COLORS.slate300)
        .restore();

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.slate700)
        .text(cell, currentX + paddingX, y + paddingY, {
          width: width - paddingX * 2,
          align: 'left',
        });

      currentX += width;
    });

    doc.y = y + rowHeight;
  });

  doc.moveDown(1);
}

function drawSingleMetricChart(doc, { title, unit, labels, values, color = COLORS.blue, chartHeight = 110 }) {
  const valid = values.filter((v) => v != null && !Number.isNaN(v));
  if (valid.length === 0) return;

  const rawMin = Math.min(...valid);
  const rawMax = Math.max(...valid);
  const pad    = (rawMax - rawMin) * 0.15 || 0.5;
  const yMin   = rawMin - pad;
  const yMax   = rawMax + pad;
  const yRange = yMax - yMin;

  const ML = 48; // espaço para rótulos Y com valores reais
  const MR = 10;
  const MB = 24; // espaço para rótulos X
  const HEADER_H = 28; // drawGroupHeader (~18 da barra + ~10 de gap)

  const pageL  = doc.page.margins.left;
  const totalW = doc.page.width - pageL - doc.page.margins.right;
  const plotX  = pageL + ML;
  const plotW  = totalW - ML - MR;
  const plotH  = chartHeight;
  const n      = labels.length;

  // Reserva espaco pro BLOCO INTEIRO (header + chart + rotulos X +
  // margem inferior) ANTES de desenhar. Antes ensureSpace media so o
  // chart e o header acabava orfa no fim da pagina + chart na proxima.
  ensureSpace(doc, HEADER_H + plotH + MB + 12);

  // cabeçalho do gráfico
  drawGroupHeader(doc, title);
  const plotY = doc.y;

  // fundo branco com borda
  doc.save().rect(plotX, plotY, plotW, plotH)
    .fillAndStroke(COLORS.white, COLORS.slate200).restore();

  // grade horizontal: 5 níveis com valores reais no eixo Y
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const pct = i / ticks;
    const val = yMin + pct * yRange;
    const gy  = plotY + plotH * (1 - pct);

    doc.save()
      .moveTo(plotX, gy).lineTo(plotX + plotW, gy)
      .lineWidth(i === 0 || i === ticks ? 0.7 : 0.2)
      .strokeColor(COLORS.slate300).stroke().restore();

    // valor real (não percentual)
    const lbl = Number.isInteger(val) ? String(val) : val.toFixed(1);
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.slate500)
      .text(lbl, pageL, gy - 3.5, { width: ML - 6, align: 'right', lineBreak: false });
  }

  // unidade no topo do eixo Y
  doc.font('Helvetica-Bold').fontSize(6).fillColor(COLORS.slate400)
    .text(unit || '', pageL, plotY - 10, { width: ML - 4, align: 'right', lineBreak: false });

  // rótulos X (máx 8)
  const step = Math.max(1, Math.floor(n / 8));
  labels.forEach((lbl, i) => {
    if (i !== 0 && i % step !== 0 && i !== n - 1) return;
    const lx = plotX + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
    doc.font('Helvetica').fontSize(5.5).fillColor(COLORS.slate500)
      .text(lbl, lx - 20, plotY + plotH + 5, { width: 40, align: 'center', lineBreak: false });
  });

  // pontos e linha principal
  const toY = (v) => plotY + plotH * (1 - (v - yMin) / yRange);
  const pts  = values.map((v, i) => ({
    x: plotX + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
    y: v != null && !Number.isNaN(v) ? toY(v) : null,
  }));

  // linha
  doc.save();
  let open = false;
  pts.forEach((pt) => {
    if (pt.y == null) { open = false; return; }
    if (!open) { doc.moveTo(pt.x, pt.y); open = true; }
    else { doc.lineTo(pt.x, pt.y); }
  });
  doc.lineWidth(2).strokeColor(color).stroke().restore();

  // área preenchida abaixo da linha
  const baseline = plotY + plotH;
  const firstPt  = pts.find((p) => p.y != null);
  const lastPt   = [...pts].reverse().find((p) => p.y != null);
  if (firstPt && lastPt) {
    doc.save();
    doc.moveTo(firstPt.x, baseline).lineTo(firstPt.x, firstPt.y);
    pts.forEach((pt) => { if (pt.y != null) doc.lineTo(pt.x, pt.y); });
    doc.lineTo(lastPt.x, baseline).closePath();
    doc.fillColor(color, 0.12).fill();
    doc.restore();
  }

  // pontos individuais
  if (n <= 80) {
    pts.forEach((pt) => {
      if (pt.y == null) return;
      doc.save().circle(pt.x, pt.y, 2.5)
        .fillAndStroke(COLORS.white, color).lineWidth(1.2).restore();
    });
  }

  // eixo Y (linha vertical)
  doc.save().moveTo(plotX, plotY).lineTo(plotX, plotY + plotH)
    .lineWidth(0.8).strokeColor(COLORS.slate400).stroke().restore();

  doc.y = plotY + plotH + MB + 4;
}

function buildHistoricoRows(eventos = [], locale, timeZone) {
  return eventos.map((evento) => {
    const metadata = evento?.metadata || {};
    const referencia = evento?.referenciaDetalhes || {};

    return [
      formatDateTime(evento?.dataEvento, locale, timeZone),
      safeText(evento?.subcategoria || evento?.categoria || 'Evento'),
      safeText(evento?.titulo),
      safeText(
        metadata?.tecnico ||
          metadata?.tecnicoResolucao ||
          referencia?.tecnicoResponsavel ||
          evento?.origem ||
          'Sistema'
      ),
      safeText(evento?.status || 'Registrado'),
    ];
  });
}

// ── Cards visuais de KPI (2 colunas, N linhas) ─────────────────────────────
function drawKpiCards(doc, cards) {
  const ml = doc.page.margins.left;
  const totalW = doc.page.width - ml - doc.page.margins.right;
  const cardW = (totalW - 10) / 2;
  const cardH = 54;
  const gapX = 10;
  const gapY = 8;

  const rows = Math.ceil(cards.length / 2);
  ensureSpace(doc, rows * (cardH + gapY) + 12);
  const startY = doc.y;

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = ml + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    doc.save().roundedRect(x, y, cardW, cardH, 3)
      .fillAndStroke(COLORS.white, COLORS.slate200).restore();

    // acento colorido lateral esquerdo
    doc.save().roundedRect(x, y, 4, cardH, 2).fill(card.color).restore();

    doc.font('Helvetica-Bold').fontSize(18).fillColor(card.color)
      .text(String(card.value), x + 12, y + 7, { width: cardW - 20, lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.slate700)
      .text(card.label, x + 12, y + 31, { width: cardW - 20, lineBreak: false });

    if (card.desc) {
      doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.slate500)
        .text(card.desc, x + 12, y + 42, { width: cardW - 20, lineBreak: false });
    }
  });

  doc.y = startY + rows * (cardH + gapY) + 8;
}

// ── Gráfico de linhas com múltiplas séries ─────────────────────────────────
function drawMultiLineChart(doc, { title, labels, series, chartHeight = 110 }) {
  const allValues = series.flatMap((s) => s.values).filter((v) => v != null && !Number.isNaN(v));
  if (allValues.length === 0) return;

  const rawMax = Math.max(...allValues, 1);
  const yMax = rawMax * 1.2;
  const yRange = yMax;

  const ML = 40;
  const MR = 10;
  const MB = 32;
  const HEADER_H = 28; // drawGroupHeader (~18 da barra + ~10 de gap)
  const pageL = doc.page.margins.left;
  const totalW = doc.page.width - pageL - doc.page.margins.right;
  const plotX = pageL + ML;
  const plotW = totalW - ML - MR;
  const plotH = chartHeight;
  const n = labels.length;

  // Reserva o bloco INTEIRO antes do desenho (header + chart + rotulos +
  // legenda). Sem isso o header podia ficar orfa no fim da pagina e o
  // chart estourar pra proxima.
  ensureSpace(doc, HEADER_H + plotH + MB + 24);
  drawGroupHeader(doc, title);
  const plotY = doc.y;

  doc.save().rect(plotX, plotY, plotW, plotH)
    .fillAndStroke(COLORS.white, COLORS.slate200).restore();

  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const pct = i / ticks;
    const val = pct * yRange;
    const gy = plotY + plotH * (1 - pct);
    doc.save()
      .moveTo(plotX, gy).lineTo(plotX + plotW, gy)
      .lineWidth(i === 0 || i === ticks ? 0.7 : 0.2)
      .strokeColor(COLORS.slate300).stroke().restore();
    const lbl = Number.isInteger(val) ? String(val) : val.toFixed(1);
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.slate500)
      .text(lbl, pageL, gy - 3.5, { width: ML - 6, align: 'right', lineBreak: false });
  }

  const step = Math.max(1, Math.floor(n / 8));
  labels.forEach((lbl, i) => {
    if (i !== 0 && i % step !== 0 && i !== n - 1) return;
    const lx = plotX + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
    doc.font('Helvetica').fontSize(5.5).fillColor(COLORS.slate500)
      .text(lbl, lx - 20, plotY + plotH + 5, { width: 40, align: 'center', lineBreak: false });
  });

  const toY = (v) => plotY + plotH * (1 - v / yRange);

  series.forEach((s) => {
    const pts = s.values.map((v, i) => ({
      x: plotX + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
      y: v != null && !Number.isNaN(v) ? toY(v) : null,
    }));

    doc.save();
    let open = false;
    pts.forEach((pt) => {
      if (pt.y == null) { open = false; return; }
      if (!open) { doc.moveTo(pt.x, pt.y); open = true; }
      else { doc.lineTo(pt.x, pt.y); }
    });
    doc.lineWidth(1.8).strokeColor(s.color).stroke().restore();

    const firstPt = pts.find((p) => p.y != null);
    const lastPt = [...pts].reverse().find((p) => p.y != null);
    if (firstPt && lastPt) {
      const baseline = plotY + plotH;
      doc.save();
      doc.moveTo(firstPt.x, baseline).lineTo(firstPt.x, firstPt.y);
      pts.forEach((pt) => { if (pt.y != null) doc.lineTo(pt.x, pt.y); });
      doc.lineTo(lastPt.x, baseline).closePath();
      doc.fillColor(s.color, 0.1).fill();
      doc.restore();
    }

    if (n <= 24) {
      pts.forEach((pt) => {
        if (pt.y == null) return;
        doc.save().circle(pt.x, pt.y, 2.5)
          .fillAndStroke(COLORS.white, s.color).lineWidth(1.2).restore();
      });
    }
  });

  doc.save().moveTo(plotX, plotY).lineTo(plotX, plotY + plotH)
    .lineWidth(0.8).strokeColor(COLORS.slate400).stroke().restore();

  const legendY = plotY + plotH + 16;
  series.forEach((s, i) => {
    const lx = plotX + i * 110;
    doc.save().rect(lx, legendY + 1, 16, 3).fill(s.color).restore();
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.slate600)
      .text(s.label, lx + 20, legendY - 1, { lineBreak: false });
  });

  doc.y = legendY + 16;
}

// ── Gráfico de barras verticais (série única) ──────────────────────────────
function drawBarChart(doc, { title, labels, values, unit = '', color = COLORS.blue, chartHeight = 90 }) {
  const hasData = values.some((v) => v != null && !Number.isNaN(v) && v > 0);
  if (!hasData) return;

  const rawMax = Math.max(...values.map((v) => (v == null || Number.isNaN(v) ? 0 : v)), 0.1);
  const yMax = rawMax * 1.25;

  const ML = 44;
  const MR = 10;
  const MB = 24;
  const HEADER_H = 28; // drawGroupHeader (~18 da barra + ~10 de gap)
  const pageL = doc.page.margins.left;
  const totalW = doc.page.width - pageL - doc.page.margins.right;
  const plotX = pageL + ML;
  const plotW = totalW - ML - MR;
  const plotH = chartHeight;
  const n = labels.length;

  // Reserva o bloco INTEIRO (header + chart + rotulos X) antes do
  // desenho — evita orfa do titulo no fim da pagina.
  ensureSpace(doc, HEADER_H + plotH + MB + 12);
  drawGroupHeader(doc, title);
  const plotY = doc.y;

  doc.save().rect(plotX, plotY, plotW, plotH)
    .fillAndStroke(COLORS.white, COLORS.slate200).restore();

  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const pct = i / ticks;
    const val = pct * yMax;
    const gy = plotY + plotH * (1 - pct);
    doc.save()
      .moveTo(plotX, gy).lineTo(plotX + plotW, gy)
      .lineWidth(i === 0 || i === ticks ? 0.7 : 0.2)
      .strokeColor(COLORS.slate300).stroke().restore();
    const lbl = val < 10 ? val.toFixed(1) : Math.round(val).toString();
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.slate500)
      .text(lbl, pageL, gy - 3.5, { width: ML - 6, align: 'right', lineBreak: false });
  }

  if (unit) {
    doc.font('Helvetica-Bold').fontSize(6).fillColor(COLORS.slate400)
      .text(unit, pageL, plotY - 10, { width: ML - 4, align: 'right', lineBreak: false });
  }

  const slotW = plotW / n;
  const barW = Math.max(4, slotW * 0.55);
  const barOffset = (slotW - barW) / 2;

  values.forEach((v, i) => {
    const val = v == null || Number.isNaN(v) ? 0 : v;
    const barH = val > 0 ? (val / yMax) * plotH : 0;
    const bx = plotX + i * slotW + barOffset;
    const by = plotY + plotH - barH;

    if (barH > 0) {
      doc.save().rect(bx, by, barW, barH).fill(color).restore();
    }

    const cx = plotX + i * slotW + slotW / 2;
    doc.font('Helvetica').fontSize(5.5).fillColor(COLORS.slate500)
      .text(labels[i], cx - 18, plotY + plotH + 5, { width: 36, align: 'center', lineBreak: false });

    if (barH > 8 && val > 0) {
      const lbl = val < 10 ? val.toFixed(1) : Math.round(val).toString();
      doc.font('Helvetica').fontSize(5.5).fillColor(COLORS.slate600)
        .text(lbl, bx - 2, by - 9, { width: barW + 4, align: 'center', lineBreak: false });
    }
  });

  doc.save().moveTo(plotX, plotY).lineTo(plotX, plotY + plotH)
    .lineWidth(0.8).strokeColor(COLORS.slate400).stroke().restore();

  doc.y = plotY + plotH + MB + 4;
}

export async function gerarPdfBIBuffer(dados, options = {}) {
  options = await injectTenantInfo(dados, options);
  const title = `RELATORIO EXECUTIVO DE PERFORMANCE - ${safeText(dados?.ano)}`;
  const doc = createDocument(title, options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);

  const fmt = (v, suffix = '') => (v !== null && v !== undefined ? `${v}${suffix}` : '—');

  const fmtHoras = (horasDecimal) => {
    if (horasDecimal == null || isNaN(horasDecimal)) return '—';
    const h = Math.floor(horasDecimal);
    const min = Math.round((horasDecimal - h) * 60);
    if (h === 0) return `${min}min`;
    if (min === 0) return `${h}h`;
    return `${h}h ${min}min`;
  };

  // reserva espaço mínimo antes de cada seção (título + cabeçalho da tabela + 3 linhas)
  const SECTION_MIN = 150;

  // ── 1. Resumo Geral ─────────────────────────────────────────────────────────
  ensureSpace(doc, SECTION_MIN);
  drawSectionTitle(doc, 'Resumo Geral');
  drawTable(doc, {
    headers: ['Indicador operacional', 'Valor acumulado'],
    columnWidths: [340, 155],
    rows: [
      ['Total de ativos no sistema', safeText(dados?.resumoGeral?.totalAtivos, '0')],
      ['Manutencoes preventivas realizadas', safeText(dados?.resumoGeral?.preventivas, '0')],
      ['Manutencoes corretivas (paradas)', safeText(dados?.resumoGeral?.corretivas, '0')],
      ['Total de manutencoes concluidas', safeText(dados?.resumoGeral?.totalManutencoesConcluidas, '0')],
    ],
  });

  // ── 2. KPIs Estratégicos ────────────────────────────────────────────────────
  ensureSpace(doc, SECTION_MIN);
  drawSectionTitle(doc, 'KPIs Estrategicos');

  drawKpiCards(doc, [
    { label: 'MTTR — Tempo Médio de Reparo',    value: fmtHoras(dados?.kpis?.mttrHoras), color: COLORS.red,  desc: 'Da abertura até conclusão da OS corretiva' },
    { label: 'MTBF — Tempo Médio entre Falhas', value: fmtHoras(dados?.kpis?.mtbfHoras), color: COLORS.blue, desc: 'Horas de operação / nº de falhas corretivas' },
  ]);

  drawTable(doc, {
    headers: ['Indicador', 'Valor', 'Descricao'],
    columnWidths: [180, 100, 215],
    rows: [
      ['MTTR (tempo medio de reparo)', fmtHoras(dados?.kpis?.mttrHoras), 'Da abertura ate conclusao da OS corretiva'],
      ['MTBF (tempo medio entre falhas)', fmtHoras(dados?.kpis?.mtbfHoras), 'Horas de operacao / numero de falhas corretivas'],
    ],
  });

  // ── 3. Evolucao Mensal ──────────────────────────────────────────────────────
  const evolucao = dados?.evolucaoMensal || [];
  if (evolucao.length > 0) {
    const meses       = evolucao.map((m) => safeText(m?.mes));
    const valPrev     = evolucao.map((m) => Number(m?.preventivas) || 0);
    const valCorret   = evolucao.map((m) => Number(m?.corretivas)  || 0);
    const valDowntime = evolucao.map((m) => Number(m?.downtime)    || 0);

    ensureSpace(doc, SECTION_MIN);
    drawSectionTitle(doc, 'Evolucao Mensal');

    drawMultiLineChart(doc, {
      title: 'Preventivas vs Corretivas por Mês',
      labels: meses,
      series: [
        { label: 'Preventivas', values: valPrev,   color: COLORS.green },
        { label: 'Corretivas',  values: valCorret, color: COLORS.red   },
      ],
    });

    if (valDowntime.some((v) => v > 0)) {
      drawBarChart(doc, {
        title: 'Downtime Mensal (horas paradas)',
        labels: meses,
        values: valDowntime,
        unit: 'h',
        color: COLORS.amber,
      });
    }

    drawTable(doc, {
      headers: ['Mes', 'Preventivas', 'Corretivas', 'Downtime (h)'],
      columnWidths: [120, 125, 125, 125],
      rows: evolucao.map((m) => [
        safeText(m?.mes),
        safeText(m?.preventivas, '0'),
        safeText(m?.corretivas, '0'),
        safeText(m?.downtime, '0'),
      ]),
    });
  }

  // ── 4. Downtime por Unidade ─────────────────────────────────────────────────
  ensureSpace(doc, SECTION_MIN);
  drawSectionTitle(doc, 'Downtime por Unidade');
  drawTable(doc, {
    headers: ['Unidade / local', 'Tempo fora de operacao'],
    columnWidths: [340, 155],
    rows: (dados?.rankingUnidades || []).map((item) => [
      safeText(item?.nome),
      fmtHoras(Number(item?.horasParado || 0)),
    ]),
  });

  // ── 5. Top Equipamentos com maior Downtime ───────────────────────────────────
  ensureSpace(doc, SECTION_MIN);
  drawSectionTitle(doc, 'Top Equipamentos com Maior Downtime');
  drawTable(doc, {
    headers: ['Equipamento / tag', 'Unidade', 'Preventivas', 'Corretivas', 'Tempo parado'],
    columnWidths: [160, 140, 65, 65, 65],
    rows: (dados?.rankingDowntime || []).map((item) => [
      `${safeText(item?.modelo)} (${safeText(item?.tag)})`,
      safeText(item?.unidade),
      safeText(item?.preventivas, '0'),
      safeText(item?.corretivas, '0'),
      fmtHoras(Number(item?.horasParado || 0)),
    ]),
  });

  // ── 6. Reincidencia de Falhas ───────────────────────────────────────────────
  const reincidentes = dados?.reincidentes?.length ? dados.reincidentes : (dados?.rankingFrequencia || []).filter((i) => i.corretivas >= 2);
  if (reincidentes.length > 0) {
    ensureSpace(doc, SECTION_MIN);
    drawSectionTitle(doc, 'Reincidencia de Falhas (>= 2 ocorrencias)');
    drawTable(doc, {
      headers: ['Equipamento / tag', 'Unidade', 'Corretivas', 'Downtime'],
      columnWidths: [190, 155, 75, 75],
      rows: reincidentes.map((item) => [
        `${safeText(item?.modelo)} (${safeText(item?.tag)})`,
        safeText(item?.unidade),
        safeText(item?.corretivas, '0'),
        fmtHoras(Number(item?.horasParado || 0)),
      ]),
    });
  }

  return finalizeDocument(doc);
}

export async function gerarPdfRelatorioBuffer(resultado, options = {}) {
  options = await injectTenantInfo(resultado, options);
  const doc = createDocument('RELATORIO', options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);
  const { locale, timeZone } = options;

  if (resultado?.tipoRelatorio === 'inventarioEquipamentos') {
    drawSectionTitle(doc, 'Inventario de ativos');

    const dados = resultado?.dados || [];

    // agrupa por unidade, ordenando grupos e itens alfabeticamente
    const grupos = {};
    for (const item of dados) {
      const key = item?.unidade?.nomeSistema || 'Sem unidade';
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(item);
    }
    const gruposOrdenados = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Altura minima por bloco: header da unidade (24) + cabecalho da
    // tabela (24+10) + ao menos 3 linhas (~30 cada com texto longo) = ~150.
    // Se nao couber esse minimo no que sobra da pagina atual, pula para
    // a proxima — evita "1 linha solitaria embaixo, resto na proxima".
    const ALTURA_MINIMA_BLOCO = 150;

    for (const unidadeNome of gruposOrdenados) {
      const itens = grupos[unidadeNome].sort((a, b) =>
        safeText(a?.modelo).localeCompare(safeText(b?.modelo), 'pt-BR')
      );

      if (doc.y + ALTURA_MINIMA_BLOCO > getMaxY(doc)) {
        doc.addPage();
      }

      drawGroupHeader(doc, unidadeNome);
      drawTable(doc, {
        headers: ['Modelo', 'Tipo', 'Serie / Tag', 'Fabricante', 'Status'],
        // Largura redistribuida para evitar quebra no meio de palavra:
        // Tipo precisa de ~100 para 'Tomografia Computadorizada' caber em
        // 2 linhas; Status precisa de ~75 para 'Desativado'/'EmManutencao'
        // caberem em 1. Modelo, Serie/Tag e Fabricante reduzem um pouco
        // para compensar (texto desses costuma ser curto).
        // Soma = 495px (igual ao layout anterior, dentro das margens).
        columnWidths: [130, 100, 110, 80, 75],
        rows: itens.map((item) => [
          safeText(item?.modelo),
          safeText(item?.tipo),
          safeText(item?.tag),
          safeText(item?.fabricante),
          safeText(item?.status),
        ]),
      });
    }
  } else {
    drawSectionTitle(doc, 'Manutencoes realizadas');
    drawTable(doc, {
      headers: ['OS / Chamado', 'Conclusao', 'Equipamento / Unidade', 'Responsavel', 'Descricao'],
      columnWidths: [90, 85, 130, 85, 105],
      rows: (resultado?.dados || []).map((item) => [
        `${safeText(item?.numeroOS)}${item?.numeroChamado ? `\nChamado: ${safeText(item.numeroChamado)}` : ''}`,
        formatDateTime(item?.dataConclusao, locale, timeZone),
        `${safeText(item?.equipamento?.modelo)} (${safeText(item?.equipamento?.tag)})\nUnidade: ${safeText(item?.equipamento?.unidade?.nomeSistema)}`,
        safeText(item?.tecnicoResponsavel),
        safeText(item?.descricaoProblemaServico, '-'),
      ]),
    });
  }

  return finalizeDocument(doc);
}

export async function gerarPdfHistoricoEquipamentoBuffer(payload, options = {}) {
  options = await injectTenantInfo(payload, options);
  const title = 'RELATORIO DE AUDITORIA DE ATIVO';
  const doc = createDocument(title, options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);
  const { locale, timeZone } = options;

  drawSectionTitle(doc, 'Contexto do equipamento');
  infoRow(doc, 'Equipamento', payload?.equipamento?.modelo);
  infoRow(doc, 'Número de série (TAG)', payload?.equipamento?.tag);
  infoRow(doc, 'Unidade', payload?.equipamento?.unidade);
  infoRow(doc, 'Período',
    payload?.filtros?.dataInicio || payload?.filtros?.dataFim
      ? `${safeText(payload?.filtros?.dataInicio, 'Início')} até ${safeText(payload?.filtros?.dataFim, 'Hoje')}`
      : 'Histórico completo',
  );

  drawSectionTitle(doc, 'Linha do tempo');
  drawTable(doc, {
    headers: ['Data', 'Categoria', 'Evento / OS', 'Responsavel', 'Status'],
    columnWidths: [95, 75, 180, 75, 70],
    rows: buildHistoricoRows(payload?.eventos || [], locale, timeZone),
  });

  return finalizeDocument(doc);
}

export async function gerarPdfOSManutencaoBuffer(manutencao, options = {}) {
  options = await injectTenantInfo(manutencao, options);
  const title = `ORDEM DE SERVICO: ${safeText(manutencao?.numeroOS, 'SEM_NUMERO')}`;
  const doc = createDocument(title, options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);
  const { locale, timeZone } = options;

  drawSectionTitle(doc, 'Informações do equipamento');
  infoRow(doc, 'Modelo', manutencao?.equipamento?.modelo);
  infoRow(doc, 'Número de série / TAG', manutencao?.equipamento?.tag);
  infoRow(doc, 'Unidade', manutencao?.equipamento?.unidade?.nomeSistema || manutencao?.equipamento?.unidade?.nome || 'N/A');
  infoRow(doc, 'Tipo', manutencao?.tipo);
  infoRow(doc, 'Número do chamado', manutencao?.numeroChamado);
  infoRow(doc, 'Status atual', manutencao?.status);

  drawSectionTitle(doc, 'Cronograma e execução real');
  drawTable(doc, {
    headers: ['Etapa', 'Data/Hora planejada', 'Data/Hora real'],
    columnWidths: [120, 185, 190],
    rows: [
      [
        'Inicio',
        formatDateTime(manutencao?.dataHoraAgendamentoInicio, locale, timeZone),
        formatDateTime(manutencao?.dataInicioReal, locale, timeZone),
      ],
      [
        'Termino',
        formatDateTime(manutencao?.dataHoraAgendamentoFim, locale, timeZone),
        formatDateTime(manutencao?.dataFimReal || manutencao?.dataConclusao, locale, timeZone),
      ],
    ],
  });

  drawSectionTitle(doc, 'Descrição do problema / serviço');
  infoRow(doc, 'Descrição', manutencao?.descricaoProblemaServico || 'Nenhuma descrição informada.');

  // Notas: separa em pre-encerramento (executadas durante a OS) vs
  // pos-encerramento (adicionadas APOS Concluida/Cancelada — comum quando
  // engenheiro lembra de algo depois ou cliente reclama de retrabalho).
  // Visualmente o "Encerramento" fica em destaque e as notas posteriores
  // viram uma secao separada para nao confundir o auditor.
  const notas = Array.isArray(manutencao?.notasAndamento) ? manutencao.notasAndamento : [];
  const dataEncerramento = manutencao?.dataConclusao || manutencao?.dataFimReal || null;
  const cutoff = dataEncerramento ? new Date(dataEncerramento).getTime() : null;
  const ehEncerrada = ['Concluida', 'Cancelada'].includes(manutencao?.status);

  const notasPre = cutoff
    ? notas.filter((n) => !n?.data || new Date(n.data).getTime() <= cutoff)
    : notas;
  const notasPos = cutoff
    ? notas.filter((n) => n?.data && new Date(n.data).getTime() > cutoff)
    : [];

  // Reserva titulo + cabecalho da tabela + 1a row mesmo se vazia
  // pra nao orfar o titulo.
  drawSectionTitle(doc, 'Histórico do chamado / notas técnicas', { minContentBelow: 60 });
  drawTable(doc, {
    headers: ['Data/Hora', 'Responsavel', 'Nota / andamento'],
    columnWidths: [100, 130, 265],
    rows: notasPre.map((nota) => [
      formatDateTime(nota?.data, locale, timeZone),
      safeText(nota?.autor?.nome, 'Sistema'),
      safeText(nota?.nota, '-'),
    ]),
    emptyMessage: 'Sem notas registradas.',
  });

  // Bloco de encerramento em destaque (so se houver). Reserva
  // titulo + 1 a 2 infoRows abaixo pra nao orfar.
  if (ehEncerrada && dataEncerramento) {
    const minBaixo = manutencao?.tecnicoResponsavel ? 28 : 16;
    drawSectionTitle(doc, `Encerramento da OS — ${manutencao.status}`, { minContentBelow: minBaixo });
    infoRow(doc, 'Encerrada em', formatDateTime(dataEncerramento, locale, timeZone));
    if (manutencao?.tecnicoResponsavel) {
      infoRow(doc, 'Responsável', manutencao.tecnicoResponsavel);
    }
  }

  // Notas pos-encerramento (so renderiza secao se houver). Reserva
  // titulo + cabecalho da tabela + 1a row pra nao orfar o titulo.
  if (notasPos.length > 0) {
    drawSectionTitle(doc, `Notas de pós-encerramento (${notasPos.length})`, { minContentBelow: 60 });
    drawTable(doc, {
      headers: ['Data/Hora', 'Responsavel', 'Nota / andamento'],
      columnWidths: [100, 130, 265],
      rows: notasPos.map((nota) => [
        formatDateTime(nota?.data, locale, timeZone),
        safeText(nota?.autor?.nome, 'Sistema'),
        safeText(nota?.nota, '-'),
      ]),
    });
  }

  return finalizeDocument(doc);
}

export async function gerarPdfContratoBuffer(contrato, options = {}) {
  options = await injectTenantInfo(contrato, options);
  const { locale, timeZone } = options;
  const title = `CONTRATO Nº ${safeText(contrato?.numeroContrato, 'SEM NUMERO')}`;
  const doc = createDocument(title, options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);

  drawSectionTitle(doc, 'Dados do contrato');
  drawInfoGrid(doc, [
    { label: 'Nº do Contrato', value: contrato?.numeroContrato },
    { label: 'Categoria', value: contrato?.categoria },
    { label: 'Fornecedor', value: contrato?.fornecedor },
    { label: 'Status', value: contrato?.status },
    { label: 'Vigência - Início', value: formatDate(contrato?.dataInicio, locale, timeZone) },
    { label: 'Vigência - Fim', value: formatDate(contrato?.dataFim, locale, timeZone) },
  ]);

  drawSectionTitle(doc, 'Equipamentos vinculados');
  const equipamentos = contrato?.equipamentosCobertos || [];
  if (equipamentos.length === 0) {
    drawTable(doc, {
      headers: ['Modelo', 'Tag', 'Status'],
      columnWidths: [255, 175, 65],
      rows: [],
      emptyMessage: 'Nenhum equipamento vinculado.',
    });
  } else {
    const grupos = {};
    for (const eq of equipamentos) {
      const key = eq?.unidade?.nomeSistema || 'Sem unidade';
      if (!grupos[key]) {
        grupos[key] = { cnpj: eq?.unidade?.cnpj || null, itens: [] };
      }
      grupos[key].itens.push(eq);
    }
    for (const [unidadeNome, { cnpj, itens }] of Object.entries(grupos)) {
      const rightText = cnpj ? `CNPJ: ${cnpj}` : null;
      drawGroupHeader(doc, unidadeNome, rightText);
      drawTable(doc, {
        headers: ['Modelo', 'Tag', 'Status'],
        columnWidths: [255, 175, 65],
        rows: itens.map((e) => [safeText(e?.modelo), safeText(e?.tag), safeText(e?.status)]),
      });
    }
  }

  return finalizeDocument(doc);
}

export async function gerarPdfUtilizacaoGehcBuffer(payload, options = {}) {
  options = await injectTenantInfo(payload, options);
  const title = 'RELATORIO DE UTILIZACAO GE HEALTHCARE';
  const doc = createDocument(title, options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);
  const { locale, timeZone } = options;

  const { periodo, totais, unidades = [] } = payload;

  drawSectionTitle(doc, 'Resumo geral');
  infoRow(doc, 'Periodo', `Ultimos ${periodo?.meses ?? 12} meses`);
  infoRow(doc, 'Total de exames', safeText(totais?.exames));
  infoRow(doc, 'Total de pacientes', safeText(totais?.pacientes));
  infoRow(doc, 'Uptime medio (contrato)', totais?.uptimeMedio != null ? `${totais.uptimeMedio}%` : 'N/A');

  for (const unidade of unidades) {
    drawSectionTitle(doc, `Unidade: ${safeText(unidade.nome)}`);
    infoRow(doc, 'Total de exames', safeText(unidade.totalExames));
    infoRow(doc, 'Total de pacientes', safeText(unidade.totalPacientes));
    infoRow(doc, 'Uptime medio', unidade.uptimeMedio != null ? `${unidade.uptimeMedio}%` : 'N/A');

    for (const eq of unidade.equipamentos ?? []) {
      // Garante espaço suficiente para cabeçalho + infoRows + header da tabela + 1 linha
      ensureSpace(doc, 175);
      drawGroupHeader(doc, `${safeText(eq.nome)} — ${safeText(eq.tag)}`);
      infoRow(doc, 'Total de exames', safeText(eq.totalExames));
      infoRow(doc, 'Media exames/dia', eq.mediaExamesDia != null ? safeText(eq.mediaExamesDia) : 'N/A');
      infoRow(doc, 'Uptime medio', eq.uptimeMedio != null ? `${eq.uptimeMedio}%` : 'N/A');

      const rows = (eq.meses ?? []).map(m => [
        m.mes ?? '—',
        m.exames        != null ? String(m.exames)                          : '—',
        m.pacientes     != null ? String(m.pacientes)                       : '—',
        m.mediaExamesDia != null ? `${m.mediaExamesDia}/dia`                : '—',
        m.duracaoMedia  != null ? `${m.duracaoMedia} min`                   : '—',
        m.uptime        != null ? `${m.uptime}%`                            : '—',
      ]);

      // Colunas somam 495pt = largura útil da página A4 (595 - 50 - 50)
      drawTable(doc, {
        headers:      ['Mes', 'Exames', 'Pacientes', 'Media/dia', 'Duracao', 'Uptime'],
        columnWidths: [80, 80, 85, 80, 85, 85],
        rows,
        emptyMessage: 'Sem dados de utilizacao para este equipamento.',
      });
    }
  }

  return finalizeDocument(doc);
}

// ─── Helpers compartilhados entre Resumido e Completo ───────────────────────

function _saudeFmtTendencia(t) {
  if (t === 'alta') return 'em alta';
  if (t === 'baixa') return 'em baixa';
  return 'estavel';
}

function _saudeKpiItems(estatisticas) {
  const items = [];
  const { helio, pressao, temperatura, uptime, total } = estatisticas;

  items.push({
    label: 'Total de leituras',
    value: String(total ?? 0),
  });

  if (helio) {
    items.push({
      label: 'Helio (%)',
      value: `${helio.media}% (min ${helio.min} / max ${helio.max}) — ${_saudeFmtTendencia(helio.tendencia)}`,
    });
  }
  if (pressao) {
    items.push({
      label: 'Pressao (PSI)',
      value: `${pressao.media} PSI (min ${pressao.min} / max ${pressao.max}) — ${_saudeFmtTendencia(pressao.tendencia)}`,
    });
  }
  if (temperatura) {
    items.push({
      label: 'Temperatura (C)',
      value: `${temperatura.media} °C (min ${temperatura.min} / max ${temperatura.max}) — ${_saudeFmtTendencia(temperatura.tendencia)}`,
    });
  }
  if (uptime) {
    items.push({
      label: 'Uptime',
      value: `${uptime.pct}% (${uptime.onlines} online / ${uptime.offlines} offline em ${uptime.leituras} leituras)`,
    });
  }
  return items;
}

function _saudeContextoEMetricas(doc, payload, estatisticas) {
  drawSectionTitle(doc, 'Contexto do equipamento');
  infoRow(doc, 'Equipamento', payload?.equipamento?.modelo);
  infoRow(doc, 'TAG / N° Serie', payload?.equipamento?.tag);
  if (payload?.equipamento?.apelido) infoRow(doc, 'Apelido', payload.equipamento.apelido);
  infoRow(doc, 'Unidade', payload?.equipamento?.unidade);
  infoRow(doc, 'Periodo',
    payload?.inicio || payload?.fim
      ? `${safeText(payload?.inicio, 'Inicio')} ate ${safeText(payload?.fim, 'Hoje')}`
      : 'Historico completo',
  );

  drawSectionTitle(doc, 'Indicadores do periodo');
  drawInfoGrid(doc, _saudeKpiItems(estatisticas), 2);
}

function _saudeGraficos(doc, snapshots, locale, timeZone) {
  if (snapshots.length < 2) return;

  const usarHora = snapshots.length <= 48;
  const fmtLabel = (capturedAt) =>
    new Intl.DateTimeFormat(locale || 'pt-BR', {
      timeZone: timeZone || 'UTC',
      day: '2-digit',
      month: '2-digit',
      ...(usarHora ? { hour: '2-digit' } : {}),
    }).format(new Date(capturedAt));

  const labels = snapshots.map((s) => fmtLabel(s.capturedAt));

  const helioValues = snapshots.map((s) => s.heliumLevelPct);
  if (helioValues.some((v) => v != null)) {
    drawSectionTitle(doc, 'Nivel de Helio no periodo');
    drawSingleMetricChart(doc, {
      title: 'Nivel de Helio (%)', unit: '%', labels, values: helioValues, color: '#3b82f6',
    });
  }

  const pressaoValues = snapshots.map((s) => s.heliumPressurePsi);
  if (pressaoValues.some((v) => v != null)) {
    drawSectionTitle(doc, 'Pressao do Helio no periodo');
    drawSingleMetricChart(doc, {
      title: 'Pressao (PSI)', unit: 'PSI', labels, values: pressaoValues, color: '#8b5cf6',
    });
  }

  const tempValues = snapshots.map((s) => s.coolantTempC);
  if (tempValues.some((v) => v != null)) {
    drawSectionTitle(doc, 'Temperatura do sistema de resfriamento');
    drawSingleMetricChart(doc, {
      title: 'Temperatura (°C)', unit: '°C', labels, values: tempValues, color: '#dc2626',
    });
  }
}

function _saudeTabelaEventos(doc, eventos, locale, timeZone, { somenteCriticos = false } = {}) {
  const lista = somenteCriticos ? eventos.filter((e) => e.severidade === 'critico') : eventos;
  if (!lista.length) {
    drawParagraph(doc, somenteCriticos
      ? 'Nenhum evento critico identificado no periodo.'
      : 'Nenhum evento fora do padrao identificado no periodo.');
    return;
  }

  drawTable(doc, {
    headers: ['Data / Hora', 'Metrica', 'Valor', 'Faixa tipica', 'Severidade'],
    columnWidths: [110, 90, 70, 145, 80],
    rows: lista.map((ev) => [
      formatDateTime(ev.capturedAt, locale, timeZone),
      ev.metrica,
      `${ev.valor}${ev.unit || ''}`,
      ev.limite || '—',
      ev.severidade === 'critico' ? 'Critico' : 'Atencao',
    ]),
    emptyMessage: 'Nenhum evento registrado.',
  });
}

/**
 * Relatorio RESUMIDO — visao executiva de poucas paginas com KPIs, eventos
 * criticos e graficos de variacao. Para periodos longos (3-6 meses), entrega
 * o essencial sem inflar o documento.
 */
export async function gerarPdfSaudeResumidoBuffer(payload, options = {}) {
  options = await injectTenantInfo(payload, options);
  const { locale, timeZone } = options;
  const snapshots = payload?.snapshots || [];

  // Lazy import pra evitar import circular se houver mudancas futuras
  const { analisarSaude } = await import('../gehc/saudeAnalytics.js');
  const analise = snapshots.length
    ? analisarSaude(snapshots)
    : { estatisticas: { total: 0 }, eventos: [], diarios: [], veredito: 'Sem leituras no periodo selecionado.' };

  const doc = createDocument('RELATORIO DE SAUDE DO ATIVO - RESUMIDO', options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);

  _saudeContextoEMetricas(doc, payload, analise.estatisticas);

  drawSectionTitle(doc, 'Avaliacao do periodo');
  drawParagraph(doc, analise.veredito);

  // GRAFICOS PRIMEIRO — leitura visual rapida da tendencia das metricas.
  // Tabelas de eventos vem depois pra detalhar pontos especificos.
  _saudeGraficos(doc, snapshots, locale, timeZone);

  // Eventos criticos so aparecem quando EXISTEM. Antes mostrava sempre
  // a secao com a tabela vazia ou cheia de falsos positivos (bug do
  // case-sensitive em compressorStatus, ja corrigido em saudeAnalytics).
  const criticos = analise.eventos.filter((e) => e.severidade === 'critico');
  if (criticos.length > 0) {
    drawSectionTitle(doc, 'Eventos criticos identificados');
    _saudeTabelaEventos(doc, criticos, locale, timeZone, { somenteCriticos: true });
  }

  const totalAtencao = analise.eventos.filter((e) => e.severidade === 'atencao').length;
  if (totalAtencao > 0) {
    drawSectionTitle(doc, 'Eventos de atencao');
    drawParagraph(
      doc,
      `${totalAtencao} evento(s) de atencao foram identificados (desvios entre 2 e 3 sigma da media, ou periodos offline). Consulte o relatorio completo para o detalhamento.`,
    );
  }

  // Mensagem positiva quando o periodo esta limpo — antes ficava uma
  // tabela vazia e silenciosa que parecia bug.
  if (criticos.length === 0 && totalAtencao === 0 && snapshots.length > 0) {
    drawSectionTitle(doc, 'Eventos no periodo');
    drawParagraph(
      doc,
      'Nenhum evento fora do padrao foi identificado no periodo selecionado. Todas as leituras de helio, pressao, temperatura e compressor permaneceram dentro dos limites esperados.',
    );
  }

  return finalizeDocument(doc);
}

/**
 * Relatorio COMPLETO — tecnico, com resumo diario, todos os eventos e graficos.
 * Substitui a tabela bruta antiga (snapshot-a-snapshot) por agregacao diaria.
 */
export async function gerarPdfSaudeCompletoBuffer(payload, options = {}) {
  options = await injectTenantInfo(payload, options);
  const { locale, timeZone } = options;
  const snapshots = payload?.snapshots || [];

  const { analisarSaude } = await import('../gehc/saudeAnalytics.js');
  const analise = snapshots.length
    ? analisarSaude(snapshots)
    : { estatisticas: { total: 0 }, eventos: [], diarios: [], veredito: 'Sem leituras no periodo selecionado.' };

  const doc = createDocument('RELATORIO DE SAUDE DO ATIVO - COMPLETO', options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);

  _saudeContextoEMetricas(doc, payload, analise.estatisticas);

  drawSectionTitle(doc, 'Avaliacao do periodo');
  drawParagraph(doc, analise.veredito);

  // GRAFICOS PRIMEIRO — leitura visual rapida da tendencia das metricas.
  // Depois vem as tabelas (resumo diario + eventos cronologicos), que
  // sao o detalhamento tecnico.
  _saudeGraficos(doc, snapshots, locale, timeZone);

  // Resumo diario — 1 linha por dia
  drawSectionTitle(doc, 'Resumo diario');
  const fmtDia = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  };
  const fmtMetrica = (m) => (m == null ? '—' : `${m.media} (${m.min}/${m.max})`);
  drawTable(doc, {
    headers: ['Data', 'Helio % (med/min/max)', 'Pressao PSI (med/min/max)', 'Temp °C (med/min/max)', 'Uptime %', 'Eventos'],
    columnWidths: [55, 110, 110, 100, 55, 60],
    rows: analise.diarios.map((d) => [
      fmtDia(d.data),
      fmtMetrica(d.helio),
      fmtMetrica(d.pressao),
      fmtMetrica(d.temperatura),
      d.uptimePct != null ? `${d.uptimePct}%` : '—',
      d.eventos > 0 ? String(d.eventos) : '—',
    ]),
    emptyMessage: 'Sem leituras agregaveis no periodo.',
  });

  // Tabela de eventos so aparece se existirem. Quando o periodo esta
  // 100% dentro do esperado, mostra mensagem em vez de tabela vazia.
  if (analise.eventos.length > 0) {
    drawSectionTitle(doc, 'Eventos fora do padrao (cronologico)');
    _saudeTabelaEventos(doc, analise.eventos, locale, timeZone);
  } else {
    drawSectionTitle(doc, 'Eventos fora do padrao');
    drawParagraph(
      doc,
      'Nenhum evento fora do padrao foi identificado no periodo selecionado.',
    );
  }

  return finalizeDocument(doc);
}

/**
 * Wrapper backwards-compatible — chamadores antigos que nao passam `modo`
 * recebem o relatorio Completo (com a nova arquitetura agregada, nao a
 * tabela bruta antiga).
 */
export async function gerarPdfSaudeEquipamentoBuffer(payload, options = {}) {
  const modo = payload?.modo;
  if (modo === 'resumido') return gerarPdfSaudeResumidoBuffer(payload, options);
  return gerarPdfSaudeCompletoBuffer(payload, options);
}

export async function gerarPdfOcorrenciaBuffer(ocorrencia, options = {}) {
  options = await injectTenantInfo(ocorrencia, options);
  const title = 'REGISTRO DE OCORRENCIA';
  const doc = createDocument(title, options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);
  const { locale, timeZone } = options;

  drawSectionTitle(doc, 'Equipamento');
  infoRow(doc, 'Modelo', ocorrencia.equipamento?.modelo);
  infoRow(doc, 'Número de série / TAG', ocorrencia.equipamento?.tag);
  infoRow(doc, 'Unidade', ocorrencia.equipamento?.unidade?.nomeSistema);

  drawSectionTitle(doc, 'Identificação do registro');
  infoRow(doc, 'Identificador', ocorrencia.id);
  infoRow(doc, 'Data do registro', formatDateTime(ocorrencia.data, locale, timeZone));
  infoRow(doc, 'Tipo', ocorrencia.tipo);
  infoRow(doc, 'Gravidade', String(ocorrencia.gravidade || 'media').toUpperCase());
  infoRow(doc, 'Origem', ocorrencia.origem || 'usuário');
  infoRow(doc, 'Técnico responsável', ocorrencia.tecnico || 'N/A');
  infoRow(doc, 'Status', ocorrencia.resolvido ? 'Resolvido' : 'Pendente');
  infoRow(doc, ocorrencia.resolvido ? 'Data resolução' : 'Aguardando',
    ocorrencia.resolvido ? formatDateTime(ocorrencia.dataResolucao, locale, timeZone) : 'Sem resolução registrada');

  drawSectionTitle(doc, 'Título');
  infoRow(doc, 'Título', ocorrencia.titulo);

  drawSectionTitle(doc, 'Descrição');
  infoRow(doc, 'Descrição', ocorrencia.descricao || 'Sem descrição informada.');

  if (ocorrencia.resolvido) {
    drawSectionTitle(doc, 'Resolução');
    infoRow(doc, 'Resolvido por', ocorrencia.tecnicoResolucao || 'N/A');
    infoRow(doc, 'Data', formatDateTime(ocorrencia.dataResolucao, locale, timeZone));
    infoRow(doc, 'Solução', ocorrencia.solucao || '-');
  }

  return finalizeDocument(doc);
}

// ─── Relatorio de Conformidade Controle de Qualidade (RDC ANVISA 611/2022) ──
//
// Estrutura por unidade: cabecalho institucional + sumario (KPI cards) +
// secao por modalidade com tabela de testes + secao de pendencias abertas.
// Usa o footer padrao com linha de "Assinatura do Responsavel Tecnico".
//
// Payload esperado:
//   {
//     unidade: { nomeSistema, endereco?, cnpj? },
//     responsavelTecnico?: string,
//     emitidoEm: Date,
//     resumo: { totalEquipamentos, conformes, vencidos, reprovacoesPendentes, pendenciasAbertas, percentualConforme },
//     porModalidade: [
//       {
//         modalidade: string,
//         testes: [
//           { equipamentoModelo, equipamentoTag, tipoCodigo, tipoNome, dataExecucao, proximoVencimento, resultado, statusLabel }
//         ]
//       }
//     ],
//     pendencias: [
//       { equipamentoModelo, equipamentoTag, tipoCodigo, descricao, diasAberta, numeroLaudo? }
//     ]
//   }
export async function gerarPdfConformidadeCqBuffer(payload, options = {}) {
  options = await injectTenantInfo(payload, options);
  const title = 'RELATÓRIO DE CONFORMIDADE — CONTROLE DE QUALIDADE';
  const doc = createDocument(title, options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);
  const { locale, timeZone } = options;

  // Bloco da norma logo no topo
  drawParagraph(
    doc,
    'Documento gerado automaticamente pelo SIMEC com base nos registros de Controle de Qualidade do tenant. ' +
      'Conformidade avaliada segundo RDC ANVISA 611/2022 e Instrução Normativa IN 90/2021. ' +
      'Os laudos de origem permanecem arquivados no sistema por no mínimo 5 anos.'
  );

  // Identificacao da unidade
  drawSectionTitle(doc, 'Unidade auditada');
  drawInfoGrid(
    doc,
    [
      { label: 'Unidade', value: payload?.unidade?.nomeSistema },
      { label: 'CNPJ', value: payload?.unidade?.cnpj || '—' },
      { label: 'Endereço', value: payload?.unidade?.endereco || '—' },
      { label: 'Emitido em', value: formatDateTime(payload?.emitidoEm || new Date(), locale, timeZone) },
    ],
    2
  );

  // Sumario executivo
  drawSectionTitle(doc, 'Resumo executivo');
  const r = payload?.resumo || {};
  drawKpiCards(doc, [
    { label: 'Equipamentos regulados', value: safeText(r.totalEquipamentos, 0), color: COLORS.blue },
    {
      label: 'Conformidade',
      value: r.percentualConforme != null ? `${r.percentualConforme}%` : '—',
      color: (r.percentualConforme ?? 0) >= 90 ? COLORS.green : (r.percentualConforme ?? 0) >= 70 ? COLORS.amber : COLORS.red,
      desc: `${safeText(r.conformes, 0)} conforme(s)`,
    },
    { label: 'Testes vencidos', value: safeText(r.vencidos, 0), color: COLORS.red },
    { label: 'Reprovações pendentes', value: safeText(r.reprovacoesPendentes, 0), color: COLORS.red },
    { label: 'Pendências abertas', value: safeText(r.pendenciasAbertas, 0), color: COLORS.amber },
  ]);

  // Tabelas por modalidade
  const modalidades = Array.isArray(payload?.porModalidade) ? payload.porModalidade : [];
  if (modalidades.length === 0) {
    drawSectionTitle(doc, 'Testes registrados');
    drawParagraph(doc, 'Nenhum teste de Controle de Qualidade registrado para esta unidade.');
  } else {
    for (const m of modalidades) {
      const testes = Array.isArray(m?.testes) ? m.testes : [];
      if (doc.y + 150 > getMaxY(doc)) doc.addPage();

      drawGroupHeader(doc, m.modalidade || 'Modalidade não identificada', `${testes.length} registro(s)`);
      drawTable(doc, {
        headers: ['Equipamento', 'Tipo de teste', 'Última execução', 'Próx. vencimento', 'Resultado', 'Status'],
        columnWidths: [125, 110, 70, 70, 60, 60],
        rows: testes.map((t) => [
          `${safeText(t.equipamentoModelo)}${t.equipamentoTag ? `\n${t.equipamentoTag}` : ''}`,
          `${safeText(t.tipoCodigo)}\n${safeText(t.tipoNome, '')}`,
          formatDate(t.dataExecucao, locale, timeZone),
          formatDate(t.proximoVencimento, locale, timeZone),
          safeText(t.resultado, 'Pendente'),
          safeText(t.statusLabel, '—'),
        ]),
        emptyMessage: 'Nenhum teste para esta modalidade.',
      });
    }
  }

  // Pendencias abertas
  const pendencias = Array.isArray(payload?.pendencias) ? payload.pendencias : [];
  if (pendencias.length > 0) {
    if (doc.y + 100 > getMaxY(doc)) doc.addPage();
    drawSectionTitle(doc, 'Pendências de laudo em aberto');
    drawTable(doc, {
      headers: ['Equipamento', 'Tipo', 'Descrição', 'Aberta há', 'Laudo'],
      columnWidths: [110, 75, 200, 50, 60],
      rows: pendencias.map((p) => [
        `${safeText(p.equipamentoModelo)}${p.equipamentoTag ? `\n${p.equipamentoTag}` : ''}`,
        safeText(p.tipoCodigo),
        safeText(p.descricao),
        p.diasAberta != null ? `${p.diasAberta}d` : '—',
        safeText(p.numeroLaudo, '—'),
      ]),
      emptyMessage: 'Sem pendências abertas.',
    });
  }

  // Bloco do responsavel tecnico (acima da assinatura do footer)
  if (payload?.responsavelTecnico) {
    if (doc.y + 60 > getMaxY(doc)) doc.addPage();
    drawSectionTitle(doc, 'Responsável técnico declarado');
    drawParagraph(doc, payload.responsavelTecnico);
  }

  return finalizeDocument(doc);
}

// Inventario Controle de Qualidade — lista equipamentos das modalidades
// reguladas por unidade. Foco em cotacao (modelo, fabricante, TAG/serie,
// CNPJ), nao em status atual dos testes.
export async function gerarPdfOrcamentoCqBuffer(payload, options = {}) {
  options = await injectTenantInfo(payload, options);
  const title = 'INVENTÁRIO CONTROLE DE QUALIDADE';
  const doc = createDocument(title, options);
  drawEntidadeInfoBlock(doc, options?.tenantInfo);
  const { locale, timeZone } = options;

  drawParagraph(
    doc,
    'Inventário de equipamentos das modalidades reguladas pela RDC ANVISA 611/2022 e ' +
      'recomendadas pela boa prática de engenharia clínica. Use este documento como base ' +
      'para solicitar orçamento de serviços de Controle de Qualidade junto a prestadores ' +
      'credenciados.'
  );

  // Resumo executivo
  drawSectionTitle(doc, 'Resumo');
  const r = payload?.resumo || {};
  drawKpiCards(doc, [
    { label: 'Equipamentos', value: safeText(r.totalEquipamentos, 0), color: COLORS.blue },
    { label: 'Unidades', value: safeText(r.totalUnidades, 0), color: COLORS.blue },
    {
      label: 'Modalidades',
      value: safeText((r.distribuicaoModalidade || []).length, 0),
      color: COLORS.slate700,
    },
    {
      label: 'Emitido em',
      value: formatDateTime(payload?.emitidoEm || new Date(), locale, timeZone),
      color: COLORS.slate700,
    },
  ]);

  // Distribuicao por modalidade — alinhada com a largura total da area
  // util da pagina (495px = 595 A4 - 50 margem esq - 50 margem dir),
  // mesma extensao dos KpiCards do Resumo.
  const dist = Array.isArray(r.distribuicaoModalidade) ? r.distribuicaoModalidade : [];
  if (dist.length > 0) {
    drawSectionTitle(doc, 'Distribuição por modalidade');
    drawTable(doc, {
      headers: ['Modalidade', 'Quantidade'],
      columnWidths: [395, 100],
      rows: dist.map((d) => [safeText(d.modalidade), String(d.quantidade)]),
      emptyMessage: 'Sem equipamentos.',
    });
  }

  // Tabelas por unidade — corpo do relatorio
  const unidades = Array.isArray(payload?.unidades) ? payload.unidades : [];
  if (unidades.length === 0) {
    drawSectionTitle(doc, 'Equipamentos por unidade');
    drawParagraph(
      doc,
      'Nenhum equipamento de modalidade regulada encontrado com os filtros aplicados.'
    );
  } else {
    for (const u of unidades) {
      const equipamentos = Array.isArray(u?.equipamentos) ? u.equipamentos : [];
      if (doc.y + 150 > getMaxY(doc)) doc.addPage();

      const nomeUnidade = u.unidade?.nomeSistema || 'Unidade';
      const cnpj = u.unidade?.cnpj || '—';
      drawGroupHeader(doc, nomeUnidade, `CNPJ: ${cnpj} · ${equipamentos.length} equipamento(s)`);

      if (u.unidade?.nomeFantasia || u.unidade?.cidade) {
        const linha = [
          u.unidade?.nomeFantasia,
          [u.unidade?.cidade, u.unidade?.estado].filter(Boolean).join(' / '),
        ].filter(Boolean).join(' · ');
        drawParagraph(doc, linha);
      }

      // Larguras pensadas pra acomodar:
      //  - "Tomografia Computadorizada" sem corte feio (precisa de >=120)
      //  - Numeros de serie longos como "S2VUM3HW500004P" (15-16 chars,
      //    precisa de >=140 com padding)
      // Total 495 = area util A4 com margens 50/50.
      drawTable(doc, {
        headers: ['Modalidade', 'Modelo', 'Fabricante', 'Nº Série (TAG)'],
        columnWidths: [130, 135, 85, 145],
        rows: equipamentos.map((e) => [
          safeText(e.tipo),
          safeText(e.modelo),
          safeText(e.fabricante),
          safeText(e.numeroSerie),
        ]),
        emptyMessage: 'Sem equipamentos nesta unidade.',
      });
    }
  }

  if (r.truncado) {
    if (doc.y + 60 > getMaxY(doc)) doc.addPage();
    drawSectionTitle(doc, 'Observação');
    drawParagraph(
      doc,
      'Relatório truncado para os primeiros 500 equipamentos. Para um parque maior, ' +
        'gere relatórios separados por unidade.'
    );
  }

  return finalizeDocument(doc);
}
