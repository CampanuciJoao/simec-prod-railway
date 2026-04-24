import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import prisma from '../prismaService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, '../../assets/logo-simec.png');

const C = {
  black:    '#000000',
  ink:      '#1a1a1a',
  gray600:  '#4b5563',
  gray400:  '#9ca3af',
  gray200:  '#e5e7eb',
  gray100:  '#f3f4f6',
  gray50:   '#f9fafb',
  white:    '#ffffff',
  red:      '#dc2626',
  redLight: '#fee2e2',
};

const BORDER = C.black;   // todas as bordas da tabela em preto
const TEXT   = C.ink;     // todos os textos em quase-preto

const TIPO_LABEL = { PRODUTO: 'Produto', SERVICO: 'Serviço', MISTO: 'Misto' };

function fmt(valor) {
  return `R$ ${Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtData(value) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

function safe(v, fallback = '') {
  return v == null || v === '' ? fallback : String(v);
}

function box(doc, x, y, w, h, { fill, stroke = BORDER } = {}) {
  doc.save();
  fill ? doc.rect(x, y, w, h).fillAndStroke(fill, stroke)
       : doc.rect(x, y, w, h).stroke(stroke);
  doc.restore();
}

// ─── widths ──────────────────────────────────────────────────────────────────

function buildCols(contentW, nForn) {
  const descW = Math.round(contentW * 0.36);
  const dataW = Math.round(contentW * 0.10);
  const leftW = descW + dataW;
  const fornW = (contentW - leftW) / Math.max(nForn, 1); // sem arredondamento → colunas somam contentW exato
  return { descW, dataW, leftW, fornW };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function obterDadosPdfOrcamento({ tenantId, orcamentoId }) {
  if (!orcamentoId) throw new Error('ORCAMENTO_ID_INVALIDO');
  const orcamento = await prisma.orcamento.findFirst({
    where: { id: orcamentoId, tenantId },
    include: {
      criadoPor:  { select: { id: true, nome: true } },
      aprovadoPor:{ select: { id: true, nome: true } },
      unidade:    { select: { id: true, nomeSistema: true, nomeFantasia: true } },
      fornecedores: { orderBy: { ordem: 'asc' }, include: { precos: true } },
      itens:        { orderBy: { ordem: 'asc' }, include: { precos: true } },
    },
  });
  if (!orcamento) throw new Error('ORCAMENTO_NAO_ENCONTRADO');
  return orcamento;
}

export async function gerarPdfOrcamentoBuffer(orcamento) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const marginX  = 36;
    const contentW = doc.page.width - marginX * 2;
    _desenhar(doc, orcamento, { marginX, contentW });
    doc.end();
  });
}

// ─── Orquestrador ────────────────────────────────────────────────────────────

function _desenhar(doc, orc, { marginX, contentW }) {
  const fornecedores = orc.fornecedores || [];
  const itens        = orc.itens        || [];
  const nForn        = fornecedores.length;
  const cols         = buildCols(contentW, nForn);

  doc.y = 32;

  _cabecalhoTitulo(doc, { marginX, contentW });
  _linhaTituloOrcamento(doc, orc, { marginX, contentW, ...cols });
  _linhaFornecedores(doc, fornecedores, { marginX, contentW, ...cols });
  _formaPagamento(doc, fornecedores, { marginX, contentW, ...cols });
  _tabelaItens(doc, fornecedores, itens, { marginX, contentW, ...cols });
  _observacao(doc, orc, { marginX, contentW });
  _assinatura(doc, orc, { marginX, contentW });
}

// ─── 1. Linha "Orçamento" (full width, com logo) ─────────────────────────────

function _cabecalhoTitulo(doc, { marginX, contentW }) {
  const rowH   = 56;
  const startY = doc.y;
  const logoSize = 44;

  box(doc, marginX, startY, contentW, rowH);

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, marginX + 8, startY + (rowH - logoSize) / 2, { fit: [logoSize, logoSize] });
  }

  doc
    .font('Helvetica-Bold').fontSize(22).fillColor(TEXT)
    .text('Orçamento', marginX + logoSize + 16, startY + 17, {
      width: contentW - logoSize - 24,
      align: 'center',
    });

  doc.y = startY + rowH;
}

// ─── 2. Linha do título real (ex: "Abrir Valeta") + metadados ────────────────
//   full width, separado da linha de fornecedores

function _linhaTituloOrcamento(doc, orc, { marginX, contentW, leftW }) {
  const rowH   = 30;
  const rightW = contentW - leftW;
  const y      = doc.y;

  // célula esquerda: título
  box(doc, marginX, y, leftW, rowH);
  doc
    .font('Helvetica-Bold').fontSize(12).fillColor(TEXT)
    .text(safe(orc.titulo, '—'), marginX + 10, y + 9, {
      width: leftW - 16,
      lineBreak: false,
      ellipsis: true,
    });

  // célula direita: metadados com borda própria
  box(doc, marginX + leftW, y, rightW, rowH, { fill: C.gray50 });
  const tipo  = TIPO_LABEL[orc.tipo] || orc.tipo || '';
  const und   = orc.unidade?.nomeFantasia || orc.unidade?.nomeSistema || '';
  const data  = fmtData(orc.createdAt);
  const meta  = [tipo, und, data].filter(Boolean).join('   ·   ');

  doc
    .font('Helvetica-Bold').fontSize(9).fillColor(TEXT)
    .text(meta, marginX + leftW + 6, y + 11, {
      width: rightW - 12,
      align: 'right',
      lineBreak: false,
    });

  doc.y = y + rowH;
}

// ─── 3. Linha de fornecedores (alinhada com colunas da tabela) ───────────────

function _linhaFornecedores(doc, fornecedores, { marginX, leftW, fornW }) {
  const nForn = fornecedores.length;
  const rowH  = 36;
  const y     = doc.y;

  box(doc, marginX, y, leftW, rowH, { fill: C.gray100 });
  doc
    .font('Helvetica-Bold').fontSize(8).fillColor(C.gray600)
    .text('Fornecedores / Prestadores', marginX + 8, y + 14, {
      width: leftW - 16,
      lineBreak: false,
    });

  for (let i = 0; i < nForn; i++) {
    const cx = marginX + leftW + i * fornW;
    box(doc, cx, y, fornW, rowH, { fill: C.gray50 });

    doc
      .font('Helvetica-Bold').fontSize(13).fillColor(TEXT)
      .text(String(i + 1), cx, y + 3, { width: fornW, align: 'center' });

    doc
      .font('Helvetica').fontSize(8.5).fillColor(C.gray600)
      .text(safe(fornecedores[i].nome, '—'), cx + 4, y + 21, {
        width: fornW - 8,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
  }

  doc.y = y + rowH;
}

// ─── 3. Forma de Pagamento ────────────────────────────────────────────────────

function _formaPagamento(doc, fornecedores, { marginX, leftW, fornW }) {
  const nForn = fornecedores.length;
  const rowH  = 24;
  const y     = doc.y;

  box(doc, marginX, y, leftW, rowH, { fill: C.gray100 });
  doc
    .font('Helvetica-Bold').fontSize(7.5).fillColor(TEXT)
    .text('FORMA DE PAGAMENTO', marginX + 8, y + 8, { width: leftW - 16 });

  for (let i = 0; i < nForn; i++) {
    const cx = marginX + leftW + i * fornW;
    box(doc, cx, y, fornW, rowH);
    doc
      .font('Helvetica').fontSize(8.5).fillColor(TEXT)
      .text(safe(fornecedores[i].formaPagamento, '—'), cx + 4, y + 7, {
        width: fornW - 8,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
  }

  doc.y = y + rowH;
}

// ─── 4. Tabela de itens ───────────────────────────────────────────────────────

function _tabelaItens(doc, fornecedores, itens, { marginX, descW, dataW, leftW, fornW }) {
  const nForn  = fornecedores.length;
  const fornIds = fornecedores.map((f) => f.id);
  const thH    = 20;

  // cabeçalho
  const y0 = doc.y;
  box(doc, marginX,         y0, descW, thH, { fill: C.gray100 });
  box(doc, marginX + descW, y0, dataW, thH, { fill: C.gray100 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT)
    .text('DESCRIÇÃO', marginX + 6, y0 + 6, { width: descW - 12 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT)
    .text('DATA', marginX + descW + 4, y0 + 6, { width: dataW - 8, align: 'center' });

  for (let i = 0; i < nForn; i++) {
    const cx = marginX + leftW + i * fornW;
    box(doc, cx, y0, fornW, thH, { fill: C.gray100 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT)
      .text('Valor Unitário', cx + 4, y0 + 6, { width: fornW - 8, align: 'right' });
  }
  doc.y = y0 + thH;

  // linhas
  for (const item of itens) {
    const rowH = 22;
    const ry   = doc.y;
    const isRed = item.isDestaque;
    const fg   = isRed ? C.red : TEXT;
    const bg   = isRed ? C.redLight : C.white;

    box(doc, marginX,         ry, descW, rowH, { fill: bg });
    box(doc, marginX + descW, ry, dataW, rowH, { fill: bg });
    doc.font(isRed ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(fg)
      .text(safe(item.descricao), marginX + 6, ry + 7, { width: descW - 12, lineBreak: false, ellipsis: true });
    doc.font('Helvetica').fontSize(8).fillColor(isRed ? C.red : C.gray600)
      .text(fmtData(item.data), marginX + descW + 4, ry + 7, { width: dataW - 8, align: 'center' });

    for (let i = 0; i < nForn; i++) {
      const fornId = fornIds[i];
      const preco  = item.precos?.find((p) => p.fornecedorId === fornId);
      const cx     = marginX + leftW + i * fornW;
      box(doc, cx, ry, fornW, rowH, { fill: bg });

      const valor    = Number(preco?.valor    || 0);
      const desconto = Number(preco?.desconto || 0);
      const exibir   = valor > 0 ? fmt(valor - desconto) : '—';
      doc.font('Helvetica-Bold').fontSize(9).fillColor(fg)
        .text(exibir, cx + 4, ry + 7, { width: fornW - 8, align: 'right' });
    }

    doc.y = ry + rowH;
  }

  // Valor Total
  const totalY = doc.y;
  const totalH = 26;
  box(doc, marginX, totalY, leftW, totalH, { fill: C.gray100 });
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(TEXT)
    .text('Valor Total', marginX + 6, totalY + 9, { width: leftW - 12, align: 'center' });

  for (let i = 0; i < nForn; i++) {
    const fornId = fornIds[i];
    const total  = itens.reduce((sum, item) => {
      const p = item.precos?.find((p) => p.fornecedorId === fornId);
      return sum + (p ? Math.max(0, Number(p.valor || 0) - Number(p.desconto || 0)) : 0);
    }, 0);

    const cx = marginX + leftW + i * fornW;
    box(doc, cx, totalY, fornW, totalH, { fill: C.redLight });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.red)
      .text(fmt(total), cx + 4, totalY + 9, { width: fornW - 8, align: 'right' });
  }

  doc.y = totalY + totalH;
}

// ─── 5. Observação ────────────────────────────────────────────────────────────

function _observacao(doc, orc, { marginX, contentW }) {
  if (!orc.observacao) return;

  const y = doc.y;

  // cabeçalho da seção
  box(doc, marginX, y, contentW, 20, { fill: C.gray100 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT)
    .text('OBSERVAÇÃO / JUSTIFICATIVA', marginX + 8, y + 6, { width: contentW - 16, align: 'center' });

  // corpo
  const bodyY   = y + 20;
  const obsText = safe(orc.observacao);
  const textH   = doc.heightOfString(obsText, { width: contentW - 24 });
  const bodyH   = Math.max(50, textH + 20);

  box(doc, marginX, bodyY, contentW, bodyH);
  doc.font('Helvetica').fontSize(9).fillColor(TEXT)
    .text(obsText, marginX + 12, bodyY + 10, { width: contentW - 24 });

  doc.y = bodyY + bodyH;
}

// ─── 6. Assinatura ───────────────────────────────────────────────────────────

function _assinatura(doc, orc, { marginX, contentW }) {
  const y      = doc.y + 52;
  const colW   = contentW * 0.38;
  const gap    = contentW - colW * 2;
  const col2X  = marginX + colW + gap;

  // Linha e label col 1 — Aprovado por
  const aprovNome = orc.aprovadoPor?.nome || '';
  doc.moveTo(marginX, y).lineTo(marginX + colW, y).lineWidth(0.8).strokeColor(C.black).stroke();
  if (aprovNome) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT)
      .text(aprovNome, marginX, y + 4, { width: colW, align: 'center' });
  }
  doc.font('Helvetica').fontSize(8).fillColor(C.gray600)
    .text('Aprovado por', marginX, y + (aprovNome ? 16 : 4), { width: colW, align: 'center' });

  // Linha e label col 2 — Data
  doc.moveTo(col2X, y).lineTo(col2X + colW, y).lineWidth(0.8).strokeColor(C.black).stroke();
  const dataTexto = orc.dataAprovacao ? fmtData(orc.dataAprovacao) : '';
  if (dataTexto) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT)
      .text(dataTexto, col2X, y + 4, { width: colW, align: 'center' });
  }
  doc.font('Helvetica').fontSize(8).fillColor(C.gray600)
    .text('Data', col2X, y + (dataTexto ? 16 : 4), { width: colW, align: 'center' });
}
