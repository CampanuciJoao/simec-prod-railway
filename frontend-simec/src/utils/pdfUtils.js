// Ficheiro: src/utils/pdfUtils.js
// VERSAO AJUSTADA - COMPATIVEL COM CHAT, PDF-DATA E RELATORIOS

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarDataHora } from './timeUtils';
import logoSimec from '../assets/images/logo-simec-base64';

const textoSeguro = (valor, fallback = 'N/A') => {
  if (valor === null || valor === undefined || valor === '') return fallback;
  return String(valor);
};

const dataSegura = (valor, fallback = 'N/A') => {
  if (!valor) return fallback;
  try {
    return formatarDataHora(valor);
  } catch {
    return fallback;
  }
};

const adicionarRodapePaginas = (doc, prefixo = 'SIMEC') => {
  const totalPaginas = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPaginas; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${prefixo} - Pagina ${i} de ${totalPaginas}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
};

const adicionarCabecalho = (doc, titulo) => {
  try {
    doc.addImage(logoSimec, 'PNG', 14, 10, 22, 22);
  } catch {
    // ignora erro de imagem sem quebrar geracao do PDF
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Gerado em: ${dataSegura(new Date())}`, 196, 15, { align: 'right' });

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.setFont(undefined, 'bold');
  doc.text(
    textoSeguro(titulo, 'RELATORIO').toUpperCase(),
    doc.internal.pageSize.getWidth() / 2,
    45,
    { align: 'center' }
  );

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 52, 196, 52);
};

export const exportarHistoricoEquipamentoPDF = (dados = [], info = {}) => {
  const doc = new jsPDF();
  adicionarCabecalho(doc, 'RELATORIO DE AUDITORIA DE ATIVO');

  doc.setFillColor(248, 250, 252);
  doc.rect(14, 58, 182, 22, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 58, 182, 22, 'S');

  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.setFont(undefined, 'bold');
  doc.text('EQUIPAMENTO:', 18, 64);
  doc.text('N SERIE (TAG):', 18, 70);
  doc.text('UNIDADE:', 18, 76);

  doc.setFont(undefined, 'normal');
  doc.text(textoSeguro(info.modelo), 45, 64);
  doc.text(textoSeguro(info.tag), 45, 70);
  doc.text(textoSeguro(info.unidade), 45, 76);

  const periodoTxt =
    info.inicio || info.fim
      ? `Periodo: ${textoSeguro(info.inicio, 'Inicio')} ate ${textoSeguro(info.fim, 'Hoje')}`
      : 'Periodo: Historico Completo';

  doc.text(periodoTxt, 120, 64);

  const headers = [['DATA EXECUCAO', 'CATEGORIA', 'EVENTO / OS', 'RESPONSAVEL', 'STATUS']];
  const body = (Array.isArray(dados) ? dados : []).map((item) => [
    dataSegura(item?.data),
    textoSeguro(item?.categoria),
    item?.isOS && item?.chamado
      ? `${textoSeguro(item?.titulo)} (Chamado: ${textoSeguro(item?.chamado)})`
      : textoSeguro(item?.titulo),
    textoSeguro(item?.responsavel),
    textoSeguro(item?.status),
  ]);

  autoTable(doc, {
    head: headers,
    body: body.length ? body : [['-', '-', 'Nenhum registro encontrado', '-', '-']],
    startY: 85,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 25 },
    },
  });

  adicionarRodapePaginas(doc, 'Auditoria SIMEC');
  doc.save(`auditoria_${textoSeguro(info.tag, 'Equipamento')}.pdf`);
};

export const exportarRelatorioPDF = (resultado = {}, nomeArquivo = 'relatorio') => {
  const doc = new jsPDF();
  let headers = [];
  let body = [];
  let tituloRelatorio = 'RELATORIO';
  let configuracaoColunas = {};

  const dados = Array.isArray(resultado?.dados) ? resultado.dados : [];

  if (resultado?.tipoRelatorio === 'inventarioEquipamentos') {
    tituloRelatorio = 'RELATORIO DE INVENTARIO DE ATIVOS';
    headers = [['MODELO', 'SERIE / TAG', 'FABRICANTE', 'REGISTRO ANVISA', 'STATUS', 'UNIDADE']];
    body = dados.map((item) => [
      textoSeguro(item?.modelo),
      textoSeguro(item?.tag),
      textoSeguro(item?.fabricante),
      textoSeguro(item?.registroAnvisa),
      textoSeguro(item?.status),
      textoSeguro(item?.unidade?.nomeSistema),
    ]);

    configuracaoColunas = {
      0: { cellWidth: 40 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
    };
  } else if (resultado?.tipoRelatorio === 'manutencoesRealizadas') {
    tituloRelatorio = 'RELATORIO DE MANUTENCOES REALIZADAS';
    headers = [['OS / CHAMADO', 'CONCLUSAO', 'EQUIPAMENTO / UNIDADE', 'RESPONSAVEL', 'DESCRICAO DO SERVICO']];

    body = dados.map((item) => [
      `${textoSeguro(item?.numeroOS)}${item?.numeroChamado ? `\nChamado: ${textoSeguro(item?.numeroChamado)}` : ''}`,
      dataSegura(item?.dataConclusao),
      `${textoSeguro(item?.equipamento?.modelo)} (${textoSeguro(item?.equipamento?.tag)})\nUnidade: ${textoSeguro(item?.equipamento?.unidade?.nomeSistema)}`,
      textoSeguro(item?.tecnicoResponsavel),
      textoSeguro(item?.descricaoProblemaServico, '-'),
    ]);

    configuracaoColunas = {
      0: { cellWidth: 35, halign: 'center' },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 45 },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 'auto' },
    };
  }

  adicionarCabecalho(doc, tituloRelatorio);

  autoTable(doc, {
    head: headers.length ? headers : [['INFORMACAO']],
    body: body.length ? body : [['Nenhum dado encontrado para este relatorio.']],
    startY: 60,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [40, 40, 40],
      valign: 'top',
      cellPadding: 3,
    },
    columnStyles: configuracaoColunas,
    styles: { overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  adicionarRodapePaginas(doc, 'Relatorios SIMEC');
  doc.save(`${nomeArquivo}.pdf`);
};

export const exportarBIPDF = (dados) => {
  const doc = new jsPDF();
  adicionarCabecalho(doc, `RELATORIO EXECUTIVO DE PERFORMANCE - ${textoSeguro(dados?.ano)}`);

  autoTable(doc, {
    head: [['INDICADOR OPERACIONAL', 'VALOR ACUMULADO']],
    body: [
      ['TOTAL DE ATIVOS NO SISTEMA', textoSeguro(dados?.resumoGeral?.totalAtivos, '0')],
      ['MANUTENCOES PREVENTIVAS REALIZADAS', textoSeguro(dados?.resumoGeral?.preventivas, '0')],
      ['MANUTENCOES CORRETIVAS (PARADAS)', textoSeguro(dados?.resumoGeral?.corretivas, '0')],
    ],
    startY: 65,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 10 },
    bodyStyles: { fontStyle: 'bold', halign: 'center', fontSize: 9, cellPadding: 4 },
  });

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. TEMPO DE PARADA (DOWNTIME) POR UNIDADE', 14, doc.lastAutoTable.finalY + 15);

  autoTable(doc, {
    head: [['UNIDADE / LOCAL', 'HORAS TOTAIS FORA DE OPERACAO']],
    body: (dados?.rankingUnidades || []).map((u) => [
      textoSeguro(u?.nome),
      `${textoSeguro(u?.horasParado, '0')} Horas`,
    ]),
    startY: doc.lastAutoTable.finalY + 20,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8.5 },
  });

  doc.text('2. REINCIDENCIA DE FALHAS (CONTINGENTE DE CORRETIVAS)', 14, doc.lastAutoTable.finalY + 15);

  autoTable(doc, {
    head: [['EQUIPAMENTO / TAG', 'UNIDADE', 'QTD. FALHAS']],
    body: (dados?.rankingFrequencia || []).map((e) => [
      `${textoSeguro(e?.modelo)} (${textoSeguro(e?.tag)})`,
      textoSeguro(e?.unidade),
      textoSeguro(e?.corretivas, '0'),
    ]),
    startY: doc.lastAutoTable.finalY + 20,
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 8.5 },
  });

  doc.text('3. TOP EQUIPAMENTOS COM MAIOR TEMPO PARADO (DOWNTIME)', 14, doc.lastAutoTable.finalY + 15);

  autoTable(doc, {
    head: [['EQUIPAMENTO / TAG', 'UNIDADE', 'TEMPO PARADO']],
    body: (dados?.rankingDowntime || []).map((e) => [
      `${textoSeguro(e?.modelo)} (${textoSeguro(e?.tag)})`,
      textoSeguro(e?.unidade),
      `${textoSeguro(e?.horasParado, '0')}h`,
    ]),
    startY: doc.lastAutoTable.finalY + 20,
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 8.5 },
  });

  adicionarRodapePaginas(doc, 'Relatorio BI SIMEC');
  doc.save(`BI_ESTRATEGICO_SIMEC_${textoSeguro(dados?.ano, 'ANO')}.pdf`);
};

export const exportarOSManutencaoPDF = (m = {}) => {
  const doc = new jsPDF();

  try {
    doc.addImage(logoSimec, 'PNG', 14, 10, 22, 22);
  } catch {
    // ignora erro de imagem
  }

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.setFont(undefined, 'bold');
  doc.text(`ORDEM DE SERVICO: ${textoSeguro(m?.numeroOS)}`, 45, 20);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Gerado em: ${dataSegura(new Date())}`, 196, 15, { align: 'right' });

  doc.setFillColor(241, 245, 249);
  doc.rect(14, 35, 182, 8, 'F');
  doc.setFont(undefined, 'bold');
  doc.text('INFORMACOES DO EQUIPAMENTO', 16, 40);

  const nomeUnidade =
    m?.equipamento?.unidade?.nomeSistema ||
    m?.equipamento?.unidade?.nome ||
    'N/A';

  autoTable(doc, {
    startY: 45,
    theme: 'plain',
    body: [
      ['MODELO:', textoSeguro(m?.equipamento?.modelo), 'N SERIE / TAG:', textoSeguro(m?.equipamento?.tag)],
      ['UNIDADE:', textoSeguro(nomeUnidade), 'TIPO:', textoSeguro(m?.tipo)],
      ['N CHAMADO:', textoSeguro(m?.numeroChamado), 'STATUS ATUAL:', textoSeguro(m?.status).toUpperCase()],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      2: { fontStyle: 'bold', cellWidth: 35 },
    },
  });

  doc.setFillColor(241, 245, 249);
  doc.rect(14, doc.lastAutoTable.finalY + 5, 182, 8, 'F');
  doc.setFont(undefined, 'bold');
  doc.text('CRONOGRAMA E EXECUCAO REAL', 16, doc.lastAutoTable.finalY + 10);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 15,
    theme: 'grid',
    head: [['ETAPA', 'DATA/HORA PLANEJADA', 'DATA/HORA REAL']],
    body: [
      [
        'INICIO:',
        dataSegura(m?.dataHoraAgendamentoInicio),
        dataSegura(m?.dataInicioReal, 'Nao iniciado'),
      ],
      [
        'TERMINO:',
        dataSegura(m?.dataHoraAgendamentoFim),
        dataSegura(m?.dataFimReal, 'Em aberto'),
      ],
    ],
    headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
    styles: { fontSize: 9 },
  });

  const yDescricao = doc.lastAutoTable.finalY + 12;
  const descricao = doc.splitTextToSize(
    textoSeguro(m?.descricaoProblemaServico, 'Nenhuma descricao informada.'),
    180
  );

  doc.setFont(undefined, 'bold');
  doc.text('DESCRICAO DO PROBLEMA / SERVICO:', 14, yDescricao);
  doc.setFont(undefined, 'normal');
  doc.text(descricao, 14, yDescricao + 6);

  const yHistoricoTitulo = yDescricao + 22 + descricao.length * 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, yHistoricoTitulo, 182, 8, 'F');
  doc.setFont(undefined, 'bold');
  doc.text('HISTORICO DO CHAMADO / NOTAS TECNICAS', 16, yHistoricoTitulo + 5);

  const historicoBody =
    Array.isArray(m?.notasAndamento) && m.notasAndamento.length > 0
      ? m.notasAndamento.map((n) => [
          dataSegura(n?.data),
          textoSeguro(n?.autor?.nome, 'Sistema'),
          textoSeguro(n?.nota, '-'),
        ])
      : [['-', '-', 'Nenhuma nota registrada']];

  autoTable(doc, {
    startY: yHistoricoTitulo + 10,
    head: [['DATA/HORA', 'RESPONSAVEL', 'NOTA/ANDAMENTO']],
    body: historicoBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    styles: { fontSize: 8, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 30;

  doc.line(14, finalY, 90, finalY);
  doc.text('Responsavel Tecnico', 14, finalY + 5);

  doc.line(110, finalY, 196, finalY);
  doc.text('Assinatura Unidade / Cliente', 110, finalY + 5);

  adicionarRodapePaginas(doc, 'OS SIMEC');
  doc.save(`OS_${textoSeguro(m?.numeroOS, 'SEM_NUMERO')}.pdf`);
};
