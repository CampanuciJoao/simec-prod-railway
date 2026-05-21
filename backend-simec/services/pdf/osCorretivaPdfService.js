import PDFDocument from 'pdfkit';
import prisma from '../prismaService.js';
import {
  resolverLogoSimec,
  prepararEntidadeInfo,
  drawEntidadeInfoBlock,
} from './_pdfLogoHelper.js';

const LOGO_SIMEC = resolverLogoSimec();

const C = {
  black: '#1e293b',
  dark: '#334155',
  mid: '#475569',
  muted: '#64748b',
  border: '#cbd5e1',
  light: '#e2e8f0',
  bg: '#f1f5f9',
  white: '#ffffff',
  blue: '#2563eb',
};

function fmt(value, locale, timeZone) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

function safe(v, fb = 'N/A') {
  return v !== null && v !== undefined && v !== '' ? String(v) : fb;
}

const STATUS_EQ = {
  Operante: 'Operante',
  Inoperante: 'Inoperante',
  UsoLimitado: 'Uso limitado',
  EmManutencao: 'Em manutenção',
  Desativado: 'Desativado',
};

const STATUS_OS = {
  Aberta: 'Aberta',
  EmAndamento: 'Em andamento',
  AguardandoTerceiro: 'Aguardando terceiro',
  Concluida: 'Concluída',
};

const STATUS_VISITA = {
  Agendada: 'Agendada',
  EmExecucao: 'Em execução',
  Concluida: 'Concluída',
  PrazoEstendido: 'Prazo estendido',
};

function maxY(doc) {
  return doc.page.height - doc.page.margins.bottom - 28;
}

function checkPageBreak(doc, neededHeight = 60) {
  if (doc.y + neededHeight > maxY(doc)) doc.addPage();
}

function drawHeader(doc, os, options) {
  const { locale, timeZone } = options;
  const W = doc.page.width;

  doc.save().rect(0, 0, W, 52).fill(C.black).restore();

  const hasLogo = !!LOGO_SIMEC;
  if (hasLogo) {
    try {
      doc.image(LOGO_SIMEC, 12, 5, { fit: [42, 42] });
    } catch (err) {
      console.warn('[OS_PDF] Falha ao renderizar logo SIMEC:', err.message);
    }
  }

  const tx = hasLogo ? 60 : 14;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(C.white).text('SIMEC', tx, 10);
  doc.font('Helvetica').fontSize(7.5).fillColor(C.border).text('Sistema de Gestão de Equipamentos de Radiologia', tx, 30);
  doc.font('Helvetica').fontSize(8).fillColor(C.border).text(`Gerado em: ${fmt(new Date(), locale, timeZone)}`, 0, 20, { align: 'right', width: W - 14, lineBreak: false });

  const tipoOS = (os.visitas && os.visitas.length > 0) ? 'Corretiva' : 'Ocorrência';
  const titulo = `Ordem de Serviço ${tipoOS} — Nº ${os.numeroOS}`;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.black).text(titulo, 50, 66, { align: 'center', width: W - 100 });

  const sepY = 90;
  doc.moveTo(50, sepY).lineTo(W - 50, sepY).lineWidth(0.8).strokeColor(C.border).stroke();
  doc.y = sepY + 12;
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const W = doc.page.width;

    // Assinatura primeiro (y menor)
    if (i === range.count - 1) {
      const sigY = doc.page.height - doc.page.margins.bottom - 52;
      doc.moveTo(100, sigY).lineTo(W - 100, sigY).lineWidth(0.8).strokeColor(C.border).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(C.muted)
        .text('Assinatura do Responsável Técnico', 100, sigY + 5, { align: 'center', width: W - 200 });
    }

    // Número da página no canto direito do rodapé
    const fy = doc.page.height - doc.page.margins.bottom - 10;
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
      .text(`Página ${i + 1} de ${range.count}`, 50, fy, { align: 'right', width: W - 100 });
  }

  // Garante que doc.y fique em posição segura para não criar página extra no doc.end()
  doc.switchToPage(range.start + range.count - 1);
  doc.y = doc.page.margins.top;
}

function sectionTitle(doc, text) {
  checkPageBreak(doc, 28);
  doc.moveDown(0.8);
  const y = doc.y;
  doc.save().rect(50, y, doc.page.width - 100, 18).fill(C.bg).restore();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.dark).text(text, 54, y + 4);
  doc.y = y + 22;
}

function infoRow(doc, label, value) {
  checkPageBreak(doc, 12);
  const y = doc.y;

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.muted)
    .text(`${label}:`, 54, y, { lineBreak: false });

  doc.font('Helvetica').fontSize(8.5).fillColor(C.dark)
    .text(` ${safe(value)}`, { lineBreak: false });

  doc.y = y + 11;
}

function highlightBadge(doc, label, value, color = C.blue) {
  checkPageBreak(doc, 22);
  const y = doc.y;
  doc.save().rect(54, y, 200, 16).fill(color).restore();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
    .text(`${label}: ${safe(value)}`, 58, y + 3, { width: 192 });
  doc.y = y + 20;
}

function timelineEvent(doc, evento, options) {
  checkPageBreak(doc, 50);
  const { locale, timeZone } = options;
  const W = doc.page.width;
  const x = 54;
  const y = doc.y;

  // Barra lateral colorida
  const TIPO_COR = {
    abertura: C.blue,
    nota: C.dark,
    visita_agendada: '#7c3aed',
    resultado_visita: '#059669',
    conclusao: '#16a34a',
  };
  const cor = TIPO_COR[evento.tipo] || C.mid;

  doc.save().rect(x, y, 3, 1).fill(cor).restore(); // placeholder height, drawn after

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted)
    .text(fmt(evento.dataHora, locale, timeZone), x + 8, y, { width: W - x - 60 });

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.dark)
    .text(evento.titulo, x + 8, doc.y + 1, { width: W - x - 60 });

  if (evento.descricao) {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.mid)
      .text(evento.descricao, x + 8, doc.y + 1, { width: W - x - 60 });
  }

  const eventHeight = doc.y - y;
  doc.save().rect(x, y, 3, Math.max(eventHeight, 12)).fill(cor).restore();

  doc.moveDown(0.3);
  doc.moveTo(x + 8, doc.y - 2).lineTo(W - 50, doc.y - 2).lineWidth(0.4).strokeColor(C.light).stroke();
  doc.moveDown(0.15);
}


// ─── Query ─────────────────────────────────────────────────────────────────────

export async function obterDadosPdfOsCorretiva({ tenantId, osId }) {
  const os = await prisma.osCorretiva.findFirst({
    where: { tenantId, id: osId },
    include: {
      equipamento: { include: { unidade: true } },
      autor: { select: { nome: true } },
      notas: {
        where: { tenantId },
        orderBy: { data: 'asc' },
        include: { autor: { select: { nome: true } } },
      },
      visitas: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!os) throw new Error('OS_NAO_ENCONTRADA');
  return os;
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export async function gerarPdfOsCorretivaBuffer(os, options = {}) {
  const { locale = 'pt-BR', timeZone = 'UTC' } = options;
  const tenantInfo = await prepararEntidadeInfo({
    unidadeId: os?.equipamento?.unidadeId || os?.equipamento?.unidade?.id,
    tenantId: os?.tenantId,
  });

  return new Promise((resolve, reject) => {
    const chunks = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 110, bottom: 48, left: 50, right: 50 },
      bufferPages: true,
    });

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, os, { locale, timeZone });

    // Bloco "Dados da Empresa" (cliente) só na primeira página.
    drawEntidadeInfoBlock(doc, tenantInfo);

    // ── Dados do equipamento
    sectionTitle(doc, 'DADOS DO EQUIPAMENTO');
    infoRow(doc, 'Equipamento', os.equipamento?.modelo);
    infoRow(doc, 'Patrimônio / Tag', os.equipamento?.numeroPatrimonio
      ? `${os.equipamento.numeroPatrimonio} / ${os.equipamento.tag}`
      : os.equipamento?.tag);
    infoRow(doc, 'Unidade / Setor', os.equipamento?.unidade?.nomeSistema || os.equipamento?.setor);
    infoRow(doc, 'Fabricante', os.equipamento?.fabricante);
    doc.moveDown(0.2);
    highlightBadge(doc, 'Status na abertura da OS', STATUS_EQ[os.statusEquipamentoAbertura] || os.statusEquipamentoAbertura, '#b45309');
    highlightBadge(doc, 'Status atual do equipamento', STATUS_EQ[os.equipamento?.status] || os.equipamento?.status, os.status === 'Concluida' ? '#16a34a' : '#b45309');

    // ── Dados da OS
    sectionTitle(doc, 'DADOS DA ORDEM DE SERVIÇO');
    infoRow(doc, 'Número da OS', os.numeroOS);
    infoRow(doc, 'Status da OS', STATUS_OS[os.status] || os.status);
    infoRow(doc, 'Solicitante', os.solicitante);
    // Abertura/Conclusão exibem a hora REAL do evento (quando retroativo).
    // O timestamp de registro no sistema fica apenas no log de auditoria e
    // na badge "Registro retroativo" da timeline visual.
    const dataAberturaExibida = os.dataHoraInicioEvento || os.dataHoraAbertura;
    infoRow(doc, 'Abertura', fmt(dataAberturaExibida, locale, timeZone));
    infoRow(doc, 'Aberta por', os.autor?.nome || 'N/A');
    infoRow(doc, 'Descrição do problema', os.descricaoProblema);

    const concluidaViaVisita = (os.visitas || []).some(v => v.resultado);

  if (os.status === 'Concluida' && os.dataHoraConclusao && !concluidaViaVisita) {
      const dataConclusaoExibida = os.dataHoraFimEvento || os.dataHoraConclusao;
      infoRow(doc, 'Conclusão', fmt(dataConclusaoExibida, locale, timeZone));
      if (os.observacoesFinais) {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.muted).text('Observações finais:', 54, doc.y);
        doc.font('Helvetica').fontSize(8.5).fillColor(C.dark).text(safe(os.observacoesFinais), 54, doc.y + 2, { width: doc.page.width - 108 });
        doc.moveDown(0.1);
      }
    }

    // ── Timeline
    sectionTitle(doc, 'TIMELINE CRONOLÓGICA');

    const timeline = buildTimeline(os, timeZone);
    for (const ev of timeline) {
      timelineEvent(doc, ev, { locale, timeZone });
    }

    drawFooter(doc);
    doc.end();
  });
}

function buildTimeline(os, timeZone = 'UTC') {
  const eventos = [];

  eventos.push({
    tipo: 'abertura',
    dataHora: os.dataHoraInicioEvento || os.dataHoraAbertura,
    titulo: `OS aberta — Status: ${STATUS_EQ[os.statusEquipamentoAbertura] || os.statusEquipamentoAbertura}`,
    descricao: `Solicitante: ${safe(os.solicitante)}. ${safe(os.descricaoProblema)}`,
  });

  for (const nota of os.notas || []) {
    const tecnico = nota.tecnicoNome || nota.autor?.nome || 'Técnico';
    eventos.push({
      tipo: 'nota',
      dataHora: nota.data,
      titulo: `Nota de andamento — ${tecnico}`,
      descricao: nota.nota,
    });
  }

  for (const visita of os.visitas || []) {
    const inicio = new Intl.DateTimeFormat('pt-BR', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(visita.dataHoraInicioPrevista));
    const fim = new Intl.DateTimeFormat('pt-BR', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(visita.dataHoraFimPrevista));

    eventos.push({
      tipo: 'visita_agendada',
      dataHora: visita.createdAt,
      titulo: `Visita agendada — ${safe(visita.prestadorNome)}`,
      descricao: `Previsão: ${inicio} até ${fim}`,
    });

    if (visita.resultado) {
      eventos.push({
        tipo: 'resultado_visita',
        dataHora: visita.updatedAt,
        titulo: `Resultado da visita — ${STATUS_VISITA[visita.status] || visita.status}`,
        descricao: visita.observacoes || `Resultado: ${visita.resultado}`,
      });
    }
  }

  // Conclusao/cancelamento sao empurrados ao FIM apos o sort cronologico
  // — regra semantica: encerramento da OS sempre por ultimo.
  eventos.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  if (os.status === 'Concluida' && os.dataHoraConclusao) {
    eventos.push({
      tipo: 'conclusao',
      dataHora: os.dataHoraFimEvento || os.dataHoraConclusao,
      titulo: 'OS concluída — Equipamento retornou a Operante',
      descricao: os.observacoesFinais || 'Manutenção corretiva encerrada com sucesso.',
    });
  }

  return eventos;
}
