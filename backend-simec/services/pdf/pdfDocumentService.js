import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(
  __dirname,
  '../../assets/logo-simec.png'
);

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
};

function formatDate(value, locale = 'pt-BR', timeZone = 'America/Cuiaba') {
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

function formatDateTime(value, locale = 'pt-BR', timeZone = 'America/Cuiaba') {
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

function drawHeader(doc, title, options = {}) {
  const { locale, timeZone } = options;
  const pageWidth = doc.page.width;
  const bandH = 52;

  doc.save().rect(0, 0, pageWidth, bandH).fill(COLORS.slate900).restore();

  const hasLogo = fs.existsSync(logoPath);
  if (hasLogo) {
    doc.image(logoPath, 12, 5, { fit: [42, 42] });
  }

  const textX = hasLogo ? 60 : 14;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.white).text('SIMEC', textX, 10);
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(COLORS.slate300)
    .text('Sistema de Manutencao de Equipamentos', textX, 30);

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

function drawFooter(doc, prefix = 'SIMEC') {
  const range = doc.bufferedPageRange();
  const lastPage = range.start + range.count - 1;

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const footerY = doc.page.height - 40;

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.slate500)
      .text(`${prefix} - Pagina ${index + 1} de ${range.count}`, 50, footerY, {
        align: 'center',
        lineBreak: false,
      });
  }

  // Restaura cursor dentro da margem para evitar página em branco extra no doc.end()
  doc.switchToPage(lastPage);
  doc.y = doc.page.height - doc.page.margins.bottom;
}

function createDocument(title, options = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
  });

  doc.info.Title = title;

  drawHeader(doc, title, options);
  doc.on('pageAdded', () => {
    drawHeader(doc, title, options);
  });

  return doc;
}

function finalizeDocument(doc, prefix) {
  drawFooter(doc, prefix);

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

function drawGroupHeader(doc, title) {
  ensureSpace(doc, 28);

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

  doc.y = y + 24;
}

function drawSectionTitle(doc, title) {
  ensureSpace(doc, 36);

  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;

  doc.save().rect(x, y, w, 22).fill(COLORS.slate100).restore();

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.slate900)
    .text(title, x + 8, y + 6, { lineBreak: false });

  doc.y = y + 30;
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
    const heights = cells.map((cell, index) =>
      doc.heightOfString(cell, {
        width: columnWidths[index] - paddingX * 2,
        align: index === 0 ? 'left' : 'left',
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

export async function gerarPdfBIBuffer(dados, options = {}) {
  const title = `RELATORIO EXECUTIVO DE PERFORMANCE - ${safeText(dados?.ano)}`;
  const doc = createDocument(title, options);
  const { locale, timeZone } = options;

  drawSectionTitle(doc, 'Resumo Geral');
  drawTable(doc, {
    headers: ['Indicador operacional', 'Valor acumulado'],
    columnWidths: [340, 155],
    rows: [
      ['Total de ativos no sistema', safeText(dados?.resumoGeral?.totalAtivos, '0')],
      ['Manutencoes preventivas realizadas', safeText(dados?.resumoGeral?.preventivas, '0')],
      ['Manutencoes corretivas (paradas)', safeText(dados?.resumoGeral?.corretivas, '0')],
      [
        'Total de manutencoes concluidas',
        safeText(dados?.resumoGeral?.totalManutencoesConcluidas, '0'),
      ],
    ],
  });

  drawSectionTitle(doc, 'Downtime por unidade');
  drawTable(doc, {
    headers: ['Unidade / local', 'Horas totais fora de operacao'],
    columnWidths: [340, 155],
    rows: (dados?.rankingUnidades || []).map((item) => [
      safeText(item?.nome),
      `${safeText(Number(item?.horasParado || 0).toFixed(2), '0')} horas`,
    ]),
  });

  drawSectionTitle(doc, 'Reincidencia de falhas');
  drawTable(doc, {
    headers: ['Equipamento / tag', 'Unidade', 'Qtd. falhas'],
    columnWidths: [220, 180, 95],
    rows: (dados?.rankingFrequencia || []).map((item) => [
      `${safeText(item?.modelo)} (${safeText(item?.tag)})`,
      safeText(item?.unidade),
      safeText(item?.corretivas, '0'),
    ]),
  });

  drawSectionTitle(doc, 'Top equipamentos com maior downtime');
  drawTable(doc, {
    headers: ['Equipamento / tag', 'Unidade', 'Tempo parado'],
    columnWidths: [220, 180, 95],
    rows: (dados?.rankingDowntime || []).map((item) => [
      `${safeText(item?.modelo)} (${safeText(item?.tag)})`,
      safeText(item?.unidade),
      `${safeText(Number(item?.horasParado || 0).toFixed(2), '0')} h`,
    ]),
  });

  return finalizeDocument(doc, 'Relatorio BI SIMEC');
}

export async function gerarPdfRelatorioBuffer(resultado, options = {}) {
  const doc = createDocument('RELATORIO', options);
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

    for (const unidadeNome of gruposOrdenados) {
      const itens = grupos[unidadeNome].sort((a, b) =>
        safeText(a?.modelo).localeCompare(safeText(b?.modelo), 'pt-BR')
      );
      drawGroupHeader(doc, unidadeNome);
      drawTable(doc, {
        headers: ['Modelo', 'Tipo', 'Serie / Tag', 'Fabricante', 'Status'],
        columnWidths: [150, 75, 120, 95, 55],
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

  return finalizeDocument(doc, 'Relatorios SIMEC');
}

export async function gerarPdfHistoricoEquipamentoBuffer(payload, options = {}) {
  const title = 'RELATORIO DE AUDITORIA DE ATIVO';
  const doc = createDocument(title, options);
  const { locale, timeZone } = options;

  drawSectionTitle(doc, 'Contexto do equipamento');
  drawInfoGrid(doc, [
    { label: 'Equipamento', value: payload?.equipamento?.modelo },
    { label: 'Numero de serie (TAG)', value: payload?.equipamento?.tag },
    { label: 'Unidade', value: payload?.equipamento?.unidade },
    {
      label: 'Periodo',
      value:
        payload?.filtros?.dataInicio || payload?.filtros?.dataFim
          ? `${safeText(payload?.filtros?.dataInicio, 'Inicio')} ate ${safeText(payload?.filtros?.dataFim, 'Hoje')}`
          : 'Historico completo',
    },
  ]);

  drawSectionTitle(doc, 'Linha do tempo');
  drawTable(doc, {
    headers: ['Data', 'Categoria', 'Evento / OS', 'Responsavel', 'Status'],
    columnWidths: [95, 75, 180, 75, 70],
    rows: buildHistoricoRows(payload?.eventos || [], locale, timeZone),
  });

  return finalizeDocument(doc, 'Auditoria SIMEC');
}

export async function gerarPdfOSManutencaoBuffer(manutencao, options = {}) {
  const title = `ORDEM DE SERVICO: ${safeText(manutencao?.numeroOS, 'SEM_NUMERO')}`;
  const doc = createDocument(title, options);
  const { locale, timeZone } = options;

  drawSectionTitle(doc, 'Informacoes do equipamento');
  drawInfoGrid(doc, [
    { label: 'Modelo', value: manutencao?.equipamento?.modelo },
    { label: 'Numero de serie / TAG', value: manutencao?.equipamento?.tag },
    {
      label: 'Unidade',
      value:
        manutencao?.equipamento?.unidade?.nomeSistema ||
        manutencao?.equipamento?.unidade?.nome ||
        'N/A',
    },
    { label: 'Tipo', value: manutencao?.tipo },
    { label: 'Numero do chamado', value: manutencao?.numeroChamado },
    { label: 'Status atual', value: manutencao?.status },
  ]);

  drawSectionTitle(doc, 'Cronograma e execucao real');
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

  drawSectionTitle(doc, 'Descricao do problema / servico');
  drawParagraph(doc, manutencao?.descricaoProblemaServico || 'Nenhuma descricao informada.');

  drawSectionTitle(doc, 'Historico do chamado / notas tecnicas');
  drawTable(doc, {
    headers: ['Data/Hora', 'Responsavel', 'Nota / andamento'],
    columnWidths: [100, 130, 265],
    rows: (manutencao?.notasAndamento || []).map((nota) => [
      formatDateTime(nota?.data, locale, timeZone),
      safeText(nota?.autor?.nome, 'Sistema'),
      safeText(nota?.nota, '-'),
    ]),
  });

  ensureSpace(doc, 90);
  const signatureY = doc.y + 30;
  doc
    .moveTo(50, signatureY)
    .lineTo(230, signatureY)
    .strokeColor(COLORS.slate500)
    .stroke();
  doc
    .moveTo(320, signatureY)
    .lineTo(545, signatureY)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.slate700)
    .text('Responsavel tecnico', 50, signatureY + 6)
    .text('Assinatura unidade / cliente', 320, signatureY + 6);

  return finalizeDocument(doc, 'OS SIMEC');
}

export async function gerarPdfOcorrenciaBuffer(ocorrencia, options = {}) {
  const title = 'REGISTRO DE OCORRENCIA';
  const doc = createDocument(title, options);
  const { locale, timeZone } = options;

  drawSectionTitle(doc, 'Equipamento');
  drawInfoGrid(doc, [
    { label: 'Modelo', value: ocorrencia.equipamento?.modelo },
    { label: 'Numero de serie / TAG', value: ocorrencia.equipamento?.tag },
    { label: 'Unidade', value: ocorrencia.equipamento?.unidade?.nomeSistema },
  ], 3);

  drawSectionTitle(doc, 'Identificacao do registro');
  drawInfoGrid(doc, [
    { label: 'Identificador unico', value: ocorrencia.id },
    { label: 'Data do registro', value: formatDateTime(ocorrencia.data, locale, timeZone) },
    { label: 'Tipo', value: ocorrencia.tipo },
    { label: 'Gravidade', value: String(ocorrencia.gravidade || 'media').toUpperCase() },
    { label: 'Origem', value: ocorrencia.origem || 'usuario' },
    { label: 'Tecnico responsavel', value: ocorrencia.tecnico || 'N/A' },
    { label: 'Status', value: ocorrencia.resolvido ? 'Resolvido' : 'Pendente' },
    ocorrencia.resolvido
      ? { label: 'Data resolucao', value: formatDateTime(ocorrencia.dataResolucao, locale, timeZone) }
      : { label: 'Aguardando', value: 'Sem resolucao registrada' },
  ]);

  drawSectionTitle(doc, 'Titulo');
  drawParagraph(doc, ocorrencia.titulo);

  drawSectionTitle(doc, 'Descricao');
  drawParagraph(doc, ocorrencia.descricao || 'Sem descricao informada.');

  if (ocorrencia.resolvido) {
    drawSectionTitle(doc, 'Resolucao');
    drawInfoGrid(doc, [
      { label: 'Resolvido por', value: ocorrencia.tecnicoResolucao || 'N/A' },
      { label: 'Data', value: formatDateTime(ocorrencia.dataResolucao, locale, timeZone) },
    ]);
    drawParagraph(doc, ocorrencia.solucao || '-');
  }

  ensureSpace(doc, 90);
  const signatureY = doc.y + 30;
  doc.moveTo(50, signatureY).lineTo(230, signatureY).strokeColor(COLORS.slate500).stroke();
  doc.moveTo(320, signatureY).lineTo(545, signatureY).stroke();
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.slate700)
    .text('Tecnico responsavel', 50, signatureY + 6)
    .text('Responsavel pela unidade', 320, signatureY + 6);

  return finalizeDocument(doc, 'Ocorrencia SIMEC');
}
