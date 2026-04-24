import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import prisma from '../prismaService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, '../../assets/logo-simec.png');

const C = {
  slate900: '#1e293b',
  slate700: '#334155',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  slate50:  '#f8fafc',
  white:    '#ffffff',
  red:      '#dc2626',
  redLight: '#fee2e2',
  redMid:   '#fca5a5',
};

const TIPO_LABEL = { PRODUTO: 'Produto', SERVICO: 'Serviço', MISTO: 'Misto' };

function formatMoeda(valor) {
  return `R$ ${Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatData(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

function safeText(v, fallback = '') {
  return v == null || v === '' ? fallback : String(v);
}

function cellRect(doc, x, y, w, h, { fill, stroke } = {}) {
  doc.save();
  if (fill && stroke) {
    doc.rect(x, y, w, h).fillAndStroke(fill, stroke);
  } else if (fill) {
    doc.rect(x, y, w, h).fill(fill);
  } else {
    doc.rect(x, y, w, h).stroke(stroke || C.slate200);
  }
  doc.restore();
}

export async function obterDadosPdfOrcamento({ tenantId, orcamentoId }) {
  if (!orcamentoId) throw new Error('ORCAMENTO_ID_INVALIDO');

  const orcamento = await prisma.orcamento.findFirst({
    where: { id: orcamentoId, tenantId },
    include: {
      criadoPor: { select: { id: true, nome: true } },
      aprovadoPor: { select: { id: true, nome: true } },
      unidade: { select: { id: true, nomeSistema: true, nomeFantasia: true } },
      fornecedores: { orderBy: { ordem: 'asc' }, include: { precos: true } },
      itens: { orderBy: { ordem: 'asc' }, include: { precos: true } },
    },
  });

  if (!orcamento) throw new Error('ORCAMENTO_NAO_ENCONTRADO');
  return orcamento;
}

export async function gerarPdfOrcamentoBuffer(orcamento, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const marginX = 36;
    const contentW = doc.page.width - marginX * 2;

    _desenharOrcamento(doc, orcamento, { marginX, contentW });

    doc.end();
  });
}

// ─── Layout constants derived from a single source of truth ──────────────────

function buildCols(contentW, nForn) {
  const descW = Math.round(contentW * 0.34);
  const dataW = Math.round(contentW * 0.09);
  const leftW = descW + dataW;                            // header/payment/total left block
  const fornW = Math.round((contentW - leftW) / Math.max(nForn, 1));
  return { descW, dataW, leftW, fornW };
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

function _desenharOrcamento(doc, orc, { marginX, contentW }) {
  const fornecedores = orc.fornecedores || [];
  const itens = orc.itens || [];
  const nForn = fornecedores.length;
  const cols = buildCols(contentW, nForn);

  const startY = 32;
  doc.y = startY;

  _cabecalho(doc, orc, fornecedores, { marginX, contentW, startY, ...cols });
  _linhaMetadados(doc, orc, { marginX, contentW });
  _linhaFormaPagamento(doc, fornecedores, { marginX, contentW, ...cols });
  _tabelaItens(doc, fornecedores, itens, { marginX, contentW, ...cols });
  _observacao(doc, orc, { marginX, contentW });
  _rodapeAssinatura(doc, orc, { marginX, contentW });
}

// ─── Cabeçalho ───────────────────────────────────────────────────────────────

function _cabecalho(doc, orc, fornecedores, { marginX, contentW, startY, leftW, fornW }) {
  const h = 68;
  const nForn = fornecedores.length;

  // left block — background
  cellRect(doc, marginX, startY, leftW, h, { fill: C.white, stroke: C.slate200 });

  // logo
  const logoSize = 48;
  const logoY = startY + (h - logoSize) / 2;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, marginX + 6, logoY, { fit: [logoSize, logoSize] });
  }

  // "ORÇAMENTO" label
  const labelX = marginX + logoSize + 14;
  const labelW = leftW - logoSize - 20;
  doc
    .font('Helvetica-Bold').fontSize(16).fillColor(C.slate900)
    .text('Orçamento', labelX, startY + 16, { width: labelW, align: 'center' });
  doc
    .font('Helvetica').fontSize(8).fillColor(C.slate500)
    .text(safeText(orc.titulo), labelX, startY + 37, { width: labelW, align: 'center', lineBreak: false, ellipsis: true });

  // supplier columns
  for (let i = 0; i < nForn; i++) {
    const cx = marginX + leftW + i * fornW;
    cellRect(doc, cx, startY, fornW, h, { fill: C.slate50, stroke: C.slate200 });

    // number badge circle area
    doc
      .font('Helvetica-Bold').fontSize(13).fillColor(C.slate900)
      .text(String(i + 1), cx, startY + 12, { width: fornW, align: 'center' });

    doc
      .font('Helvetica-Bold').fontSize(8).fillColor(C.slate700)
      .text(safeText(fornecedores[i].nome, '—'), cx + 4, startY + 32, {
        width: fornW - 8,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
  }

  doc.y = startY + h;
}

// ─── Linha de metadados (tipo · unidade · data) ───────────────────────────────

function _linhaMetadados(doc, orc, { marginX, contentW }) {
  const rowH = 20;
  const y = doc.y;

  cellRect(doc, marginX, y, contentW, rowH, { fill: C.slate100, stroke: C.slate200 });

  const tipo = TIPO_LABEL[orc.tipo] || orc.tipo || '';
  const unidade = orc.unidade?.nomeFantasia || orc.unidade?.nomeSistema || '';
  const criadoEm = formatData(orc.createdAt);

  const parts = [tipo, unidade, criadoEm ? `Emitido em ${criadoEm}` : ''].filter(Boolean).join('   ·   ');

  doc
    .font('Helvetica').fontSize(8).fillColor(C.slate500)
    .text(parts, marginX + 8, y + 6, { width: contentW - 16, align: 'center' });

  doc.y = y + rowH;
}

// ─── Linha Forma de Pagamento ─────────────────────────────────────────────────

function _linhaFormaPagamento(doc, fornecedores, { marginX, contentW, leftW, fornW }) {
  const nForn = fornecedores.length;
  const rowH = 26;
  const y = doc.y;

  cellRect(doc, marginX, y, leftW, rowH, { fill: C.slate100, stroke: C.slate200 });
  doc
    .font('Helvetica-Bold').fontSize(7.5).fillColor(C.slate700)
    .text('FORMA DE PAGAMENTO', marginX + 8, y + 9, { width: leftW - 16 });

  for (let i = 0; i < nForn; i++) {
    const cx = marginX + leftW + i * fornW;
    cellRect(doc, cx, y, fornW, rowH, { stroke: C.slate200 });
    doc
      .font('Helvetica').fontSize(8).fillColor(C.slate700)
      .text(safeText(fornecedores[i].formaPagamento, '—'), cx + 4, y + 9, {
        width: fornW - 8,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
  }

  doc.y = y + rowH;
}

// ─── Tabela de itens ──────────────────────────────────────────────────────────

function _tabelaItens(doc, fornecedores, itens, { marginX, contentW, descW, dataW, leftW, fornW }) {
  const nForn = fornecedores.length;
  const fornIds = fornecedores.map((f) => f.id);
  const thH = 22;

  // ── cabeçalho da tabela
  const y0 = doc.y;
  cellRect(doc, marginX, y0, descW, thH, { fill: C.slate100, stroke: C.slate200 });
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.slate700)
    .text('DESCRIÇÃO', marginX + 6, y0 + 7, { width: descW - 12 });

  cellRect(doc, marginX + descW, y0, dataW, thH, { fill: C.slate100, stroke: C.slate200 });
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.slate700)
    .text('DATA', marginX + descW + 4, y0 + 7, { width: dataW - 8, align: 'center' });

  for (let i = 0; i < nForn; i++) {
    const cx = marginX + leftW + i * fornW;
    cellRect(doc, cx, y0, fornW, thH, { fill: C.slate100, stroke: C.slate200 });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.slate700)
      .text('Valor Unitário', cx + 4, y0 + 7, { width: fornW - 8, align: 'right' });
  }

  doc.y = y0 + thH;

  // ── linhas de itens
  for (const item of itens) {
    const rowH = 22;
    const ry = doc.y;
    const isRed = item.isDestaque;
    const textColor = isRed ? C.red : C.slate900;
    const bg = isRed ? C.redLight : C.white;

    cellRect(doc, marginX, ry, descW, rowH, { fill: bg, stroke: C.slate200 });
    doc.font(isRed ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(textColor)
      .text(safeText(item.descricao), marginX + 6, ry + 7, { width: descW - 12, lineBreak: false, ellipsis: true });

    cellRect(doc, marginX + descW, ry, dataW, rowH, { fill: bg, stroke: C.slate200 });
    doc.font('Helvetica').fontSize(8).fillColor(isRed ? C.red : C.slate500)
      .text(formatData(item.data), marginX + descW + 4, ry + 7, { width: dataW - 8, align: 'center' });

    for (let i = 0; i < nForn; i++) {
      const fornId = fornIds[i];
      const preco = item.precos?.find((p) => p.fornecedorId === fornId);
      const cx = marginX + leftW + i * fornW;

      cellRect(doc, cx, ry, fornW, rowH, { fill: bg, stroke: C.slate200 });

      if (preco) {
        const valor = Number(preco.valor || 0);
        const desconto = Number(preco.desconto || 0);
        const net = valor - desconto;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textColor)
          .text(valor > 0 ? formatMoeda(net) : '—', cx + 4, ry + 7, { width: fornW - 8, align: 'right' });
      } else {
        doc.font('Helvetica').fontSize(8.5).fillColor(C.slate400)
          .text('—', cx + 4, ry + 7, { width: fornW - 8, align: 'right' });
      }
    }

    doc.y = ry + rowH;
  }

  // ── linha Valor Total
  const totalY = doc.y;
  const totalH = 26;

  cellRect(doc, marginX, totalY, leftW, totalH, { fill: C.slate100, stroke: C.slate200 });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slate900)
    .text('Valor Total', marginX + 6, totalY + 9, { width: leftW - 12, align: 'center' });

  for (let i = 0; i < nForn; i++) {
    const fornId = fornIds[i];
    const total = itens.reduce((sum, item) => {
      const p = item.precos?.find((p) => p.fornecedorId === fornId);
      if (!p) return sum;
      return sum + Math.max(0, Number(p.valor || 0) - Number(p.desconto || 0));
    }, 0);

    const cx = marginX + leftW + i * fornW;
    cellRect(doc, cx, totalY, fornW, totalH, { fill: C.redLight, stroke: C.slate200 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.red)
      .text(formatMoeda(total), cx + 4, totalY + 9, { width: fornW - 8, align: 'right' });
  }

  doc.y = totalY + totalH;
}

// ─── Observação ───────────────────────────────────────────────────────────────

function _observacao(doc, orc, { marginX, contentW }) {
  if (!orc.observacao) return;

  const y = doc.y + 16;

  // título da seção
  cellRect(doc, marginX, y, contentW, 20, { fill: C.slate100, stroke: C.slate200 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.slate700)
    .text('OBSERVAÇÃO / JUSTIFICATIVA', marginX + 8, y + 6, { width: contentW - 16, align: 'center' });

  // corpo
  const bodyY = y + 20;
  const obsText = safeText(orc.observacao);
  const textH = doc.heightOfString(obsText, { width: contentW - 24 });
  const bodyH = Math.max(52, textH + 20);

  cellRect(doc, marginX, bodyY, contentW, bodyH, { stroke: C.slate200 });
  doc.font('Helvetica').fontSize(9).fillColor(C.slate700)
    .text(obsText, marginX + 12, bodyY + 10, { width: contentW - 24 });

  doc.y = bodyY + bodyH;
}

// ─── Rodapé de assinatura ─────────────────────────────────────────────────────

function _rodapeAssinatura(doc, orc, { marginX, contentW }) {
  const y = doc.y + 48;   // more breathing room
  const lineLen = contentW * 0.36;
  const midX = marginX + contentW / 2;

  // left line — aprovador
  doc.moveTo(marginX + 16, y).lineTo(marginX + 16 + lineLen, y)
    .lineWidth(0.75).strokeColor(C.slate400).stroke();

  const aprovadorNome = orc.aprovadoPor?.nome || '________________________________';
  doc.font('Helvetica').fontSize(8).fillColor(C.slate500)
    .text(aprovadorNome, marginX + 16, y + 4, { width: lineLen, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.slate400)
    .text('Aprovado por', marginX + 16, y + 16, { width: lineLen, align: 'center' });

  // right line — data
  const rightX = marginX + contentW - 16 - lineLen;
  doc.moveTo(rightX, y).lineTo(rightX + lineLen, y)
    .lineWidth(0.75).strokeColor(C.slate400).stroke();

  const dataTexto = orc.dataAprovacao ? formatData(orc.dataAprovacao) : '___/___/______';
  doc.font('Helvetica').fontSize(8).fillColor(C.slate500)
    .text(dataTexto, rightX, y + 4, { width: lineLen, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.slate400)
    .text('Data', rightX, y + 16, { width: lineLen, align: 'center' });
}
