import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import prisma from '../prismaService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, '../../assets/logo-simec.png');

const COLORS = {
  slate900: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate400: '#94a3b8',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  white: '#ffffff',
  red: '#dc2626',
  redLight: '#fee2e2',
};

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

export async function obterDadosPdfOrcamento({ tenantId, orcamentoId }) {
  if (!orcamentoId) throw new Error('ORCAMENTO_ID_INVALIDO');

  const orcamento = await prisma.orcamento.findFirst({
    where: { id: orcamentoId, tenantId },
    include: {
      criadoPor: { select: { id: true, nome: true } },
      aprovadoPor: { select: { id: true, nome: true } },
      fornecedores: {
        orderBy: { ordem: 'asc' },
        include: { precos: true },
      },
      itens: {
        orderBy: { ordem: 'asc' },
        include: { precos: true },
      },
    },
  });

  if (!orcamento) throw new Error('ORCAMENTO_NAO_ENCONTRADO');

  return orcamento;
}

export async function gerarPdfOrcamentoBuffer(orcamento, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const marginX = 40;
    const contentW = pageW - marginX * 2;

    _desenharOrcamento(doc, orcamento, { pageW, marginX, contentW, options });

    doc.end();
  });
}

function _desenharOrcamento(doc, orc, { pageW, marginX, contentW }) {
  const fornecedores = orc.fornecedores || [];
  const itens = orc.itens || [];
  const nForn = fornecedores.length;

  // ─── Cabeçalho ────────────────────────────────────────────────
  const headerH = 64;
  doc.save().rect(marginX, 30, contentW, headerH).stroke(COLORS.slate200).restore();

  // logo
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, marginX + 6, 36, { fit: [50, 50] });
  }

  // título ORÇAMENTO
  const titleX = marginX + 62;
  const titleW = contentW * 0.38;
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.slate900)
    .text('Orçamento', titleX, 50, { width: titleW, align: 'center' });

  // colunas de fornecedor (numeradas)
  if (nForn > 0) {
    const colW = (contentW - titleX - titleW + marginX) / nForn;
    const colStartX = marginX + titleW + 62;
    const adjustedColW = (contentW - (titleW + 62)) / nForn;

    for (let i = 0; i < nForn; i++) {
      const cx = marginX + titleW + 62 + i * adjustedColW;
      doc.save().rect(cx, 30, adjustedColW, headerH).stroke(COLORS.slate200).restore();
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.slate900)
        .text(String(i + 1), cx, 38, { width: adjustedColW, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate700)
        .text(safeText(fornecedores[i].nome), cx + 4, 54, {
          width: adjustedColW - 8,
          align: 'center',
          lineBreak: false,
          ellipsis: true,
        });
    }
  }

  doc.y = 30 + headerH + 4;

  // ─── Forma de Pagamento ───────────────────────────────────────
  _desenharLinhaFormaPagamento(doc, orc, fornecedores, { marginX, contentW });

  // ─── Tabela de itens ──────────────────────────────────────────
  _desenharTabelaItens(doc, orc, fornecedores, itens, { marginX, contentW });

  // ─── Observação ───────────────────────────────────────────────
  _desenharObservacao(doc, orc, { marginX, contentW });

  // ─── Rodapé de aprovação ──────────────────────────────────────
  _desenharRodapeAprovacao(doc, orc, { marginX, contentW, pageW });
}

function _desenharLinhaFormaPagamento(doc, orc, fornecedores, { marginX, contentW }) {
  const nForn = fornecedores.length;
  const rowH = 28;
  const labelW = contentW * 0.34;
  const colW = nForn > 0 ? (contentW - labelW) / nForn : contentW - labelW;
  const y = doc.y;

  // label
  doc.save()
    .rect(marginX, y, labelW, rowH)
    .fillAndStroke(COLORS.slate100, COLORS.slate200)
    .restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.slate700)
    .text('FORMA DE PAGAMENTO', marginX + 4, y + 9, { width: labelW - 8 });

  for (let i = 0; i < nForn; i++) {
    const cx = marginX + labelW + i * colW;
    doc.save().rect(cx, y, colW, rowH).stroke(COLORS.slate200).restore();
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.slate700)
      .text(safeText(fornecedores[i].formaPagamento, '—'), cx + 4, y + 9, {
        width: colW - 8,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
  }

  doc.y = y + rowH;
}

function _desenharTabelaItens(doc, orc, fornecedores, itens, { marginX, contentW }) {
  const nForn = fornecedores.length;
  const headerH = 22;
  const descW = contentW * 0.30;
  const dataW = contentW * 0.12;
  const colW = nForn > 0 ? (contentW - descW - dataW) / nForn : 0;

  // cabeçalho da tabela
  const y0 = doc.y + 2;
  doc.save().rect(marginX, y0, descW, headerH).fillAndStroke(COLORS.slate100, COLORS.slate200).restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.slate700)
    .text('DESCRIÇÃO', marginX + 4, y0 + 7, { width: descW - 8 });

  doc.save().rect(marginX + descW, y0, dataW, headerH).fillAndStroke(COLORS.slate100, COLORS.slate200).restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.slate700)
    .text('Data', marginX + descW + 4, y0 + 7, { width: dataW - 8, align: 'center' });

  for (let i = 0; i < nForn; i++) {
    const cx = marginX + descW + dataW + i * colW;
    doc.save().rect(cx, y0, colW, headerH).fillAndStroke(COLORS.slate100, COLORS.slate200).restore();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.slate700)
      .text('Valor Unitário', cx + 4, y0 + 7, { width: colW - 8, align: 'center' });
  }

  doc.y = y0 + headerH;

  // linhas de itens
  const fornecedorIds = fornecedores.map((f) => f.id);

  for (const item of itens) {
    const rowH = 24;
    const ry = doc.y;
    const textColor = item.isDestaque ? COLORS.red : COLORS.slate900;
    const bgColor = item.isDestaque ? COLORS.redLight : COLORS.white;

    doc.save().rect(marginX, ry, descW, rowH).fillAndStroke(bgColor, COLORS.slate200).restore();
    doc.font(item.isDestaque ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(textColor)
      .text(safeText(item.descricao), marginX + 4, ry + 8, { width: descW - 8, lineBreak: false, ellipsis: true });

    doc.save().rect(marginX + descW, ry, dataW, rowH).fillAndStroke(bgColor, COLORS.slate200).restore();
    doc.font('Helvetica').fontSize(8).fillColor(textColor)
      .text(formatData(item.data), marginX + descW + 4, ry + 8, { width: dataW - 8, align: 'center' });

    for (let i = 0; i < nForn; i++) {
      const fornId = fornecedorIds[i];
      const preco = item.precos?.find((p) => p.fornecedorId === fornId);
      const cx = marginX + descW + dataW + i * colW;

      doc.save().rect(cx, ry, colW, rowH).fillAndStroke(bgColor, COLORS.slate200).restore();

      if (preco) {
        const valor = Number(preco.valor || 0);
        const desconto = Number(preco.desconto || 0);
        const exibir = valor > 0 ? formatMoeda(valor - desconto) : '—';
        doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor)
          .text(exibir, cx + 4, ry + 8, { width: colW - 8, align: 'right' });
      } else {
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.slate400)
          .text('—', cx + 4, ry + 8, { width: colW - 8, align: 'right' });
      }
    }

    doc.y = ry + rowH;
  }

  // linha VALOR TOTAL
  const totalY = doc.y;
  const totalH = 26;

  doc.save().rect(marginX, totalY, descW + dataW, totalH).fillAndStroke(COLORS.slate100, COLORS.slate200).restore();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate900)
    .text('Valor Total', marginX + 4, totalY + 9, { width: descW + dataW - 8, align: 'center' });

  for (let i = 0; i < nForn; i++) {
    const fornId = fornecedorIds[i];
    const total = itens.reduce((sum, item) => {
      const preco = item.precos?.find((p) => p.fornecedorId === fornId);
      if (!preco) return sum;
      return sum + Number(preco.valor || 0) - Number(preco.desconto || 0);
    }, 0);

    const cx = marginX + descW + dataW + i * colW;
    doc.save().rect(cx, totalY, colW, totalH).fillAndStroke(COLORS.redLight, COLORS.slate200).restore();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.red)
      .text(formatMoeda(total), cx + 4, totalY + 9, { width: colW - 8, align: 'right' });
  }

  doc.y = totalY + totalH + 8;
}

function _desenharObservacao(doc, orc, { marginX, contentW }) {
  if (!orc.observacao) return;

  const y = doc.y + 4;

  doc.save().rect(marginX, y, contentW, 20).fillAndStroke(COLORS.slate100, COLORS.slate200).restore();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate900)
    .text('Observação', marginX + 4, y + 6, { width: contentW - 8, align: 'center' });

  const obsY = y + 20;
  const obsText = safeText(orc.observacao);
  const textHeight = doc.heightOfString(obsText, { width: contentW - 20, fontSize: 9 });
  const obsH = Math.max(60, textHeight + 20);

  doc.save().rect(marginX, obsY, contentW, obsH).stroke(COLORS.slate200).restore();
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.slate700)
    .text(obsText, marginX + 10, obsY + 10, { width: contentW - 20, align: 'center' });

  if (orc.local) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate900)
      .text(`Local: ${orc.local}`, marginX + 10, obsY + obsH - 20, { width: contentW - 20, align: 'center' });
  }

  doc.y = obsY + obsH + 12;
}

function _desenharRodapeAprovacao(doc, orc, { marginX, contentW }) {
  const y = doc.y + 8;
  const midX = marginX + contentW / 2;

  doc.moveTo(marginX + 20, y).lineTo(midX - 20, y).lineWidth(0.5).strokeColor(COLORS.slate400).stroke();

  const aprovadorNome = orc.aprovadoPor?.nome || 'Luiz Dias Dutra';
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.slate700)
    .text(`Aprovado por:`, marginX + 20, y + 4, { width: 200, continued: false });
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.slate700)
    .text(aprovadorNome, marginX + contentW / 4 - 40, y + 14, { width: 200, align: 'center' });

  doc.moveTo(midX + 20, y).lineTo(marginX + contentW - 20, y).lineWidth(0.5).strokeColor(COLORS.slate400).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.slate700)
    .text('DATA:', midX + 20, y + 4);

  if (orc.dataAprovacao) {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.slate700)
      .text(formatData(orc.dataAprovacao), midX + 60, y + 4);
  }
}
