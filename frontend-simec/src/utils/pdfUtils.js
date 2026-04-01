// Ficheiro: src/utils/pdfUtils.js
// VERSÃO CONSOLIDADA - DESIGN EXECUTIVO, CORREÇÃO DE LOGO E ALINHAMENTO DE CHAMADOS
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarDataHora } from './timeUtils';
import logoSimec from '../assets/images/logo-simec-base64';

/**
 * 1. CABEÇALHO PADRÃO (Corrigido para evitar sobreposição do Logo)
 */
const adicionarCabecalho = (doc, titulo) => {
  // Logo no canto superior esquerdo
  try { doc.addImage(logoSimec, 'PNG', 14, 10, 22, 22); } catch (e) {}
  
  // Data de geração no topo direito
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Gerado em: ${formatarDataHora(new Date())}`, 196, 15, { align: 'right' });

  // Título: Posicionado em Y=45 para dar distância segura do logo
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.setFont(undefined, 'bold');
  doc.text(titulo.toUpperCase(), doc.internal.pageSize.getWidth() / 2, 45, { align: 'center' });

  // Linha divisória elegante
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 52, 196, 52);
};

/**
 * 2. PDF DE AUDITORIA DO ATIVO
 */
export const exportarHistoricoEquipamentoPDF = (dados, info) => {
  const doc = new jsPDF();
  adicionarCabecalho(doc, "RELATÓRIO DE AUDITORIA DE ATIVO");
  
  // Quadro de informações do equipamento
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 58, 182, 22, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 58, 182, 22, 'S');
  
  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.setFont(undefined, 'bold');
  doc.text("EQUIPAMENTO:", 18, 64);
  doc.text("Nº SÉRIE (TAG):", 18, 70);
  doc.text("UNIDADE:", 18, 76);
  
  doc.setFont(undefined, 'normal');
  doc.text(`${info.modelo || 'N/A'}`, 45, 64);
  doc.text(`${info.tag || 'N/A'}`, 45, 70);
  doc.text(`${info.unidade || 'N/A'}`, 45, 76);
  
  const periodoTxt = info.inicio || info.fim
    ? `Período: ${info.inicio || 'Início'} até ${info.fim || 'Hoje'}`
    : "Período: Histórico Completo";
  doc.text(periodoTxt, 120, 64);
  
  const headers = [["DATA EXECUÇÃO", "CATEGORIA", "EVENTO / OS", "RESPONSÁVEL", "STATUS"]];
  const body = dados.map(item => [
    formatarDataHora(item.data),
    item.categoria,
    item.isOS && item.chamado ? `${item.titulo} (Chamado: ${item.chamado})` : item.titulo,
    item.responsavel || 'N/A',
    item.status
  ]);
  
  autoTable(doc, {
    head: headers,
    body: body,
    startY: 85,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 3 },
    columnStyles: { 0: { halign: 'center', cellWidth: 30 }, 1: { halign: 'center', cellWidth: 25 }, 4: { halign: 'center', cellWidth: 25 } }
  });
  
  doc.save(`auditoria_${(info.tag || 'Equipamento')}.pdf`);
};

/**
 * 3. PDF DE RELATÓRIOS GERAIS
 */
export const exportarRelatorioPDF = (resultado, nomeArquivo) => {
  const doc = new jsPDF();
  let headers = [];
  let body = [];
  let tituloRelatorio = "";
  let configuracaoColunas = {};
  
  if (resultado.tipoRelatorio === 'inventarioEquipamentos') {
    tituloRelatorio = "RELATÓRIO DE INVENTÁRIO DE ATIVOS";
    headers = [["MODELO", "SÉRIE / TAG", "FABRICANTE", "REGISTRO ANVISA", "STATUS", "UNIDADE"]];
    body = resultado.dados.map(item => [
      item.modelo || 'N/A', item.tag || 'N/A', item.fabricante || 'N/A',
      item.registroAnvisa || 'N/A', item.status || 'N/A', item.unidade?.nomeSistema || 'N/A'
    ]);
    configuracaoColunas = { 0: { cellWidth: 40 }, 1: { cellWidth: 30, halign: 'center' }, 4: { cellWidth: 25, halign: 'center' } };
  }
  else if (resultado.tipoRelatorio === 'manutencoesRealizadas') {
    tituloRelatorio = "RELATÓRIO DE MANUTENÇÕES REALIZADAS";
    headers = [["OS / CHAMADO", "CONCLUSÃO", "EQUIPAMENTO / UNIDADE", "RESPONSÁVEL", "DESCRIÇÃO DO SERVIÇO"]];
    body = resultado.dados.map(item => [
         `${item.numeroOS}${item.numeroChamado ? '\nChamado: ' + item.numeroChamado : ''}`,
         formatarDataHora(item.dataConclusao),
         `${item.equipamento.modelo} (${item.equipamento.tag})\nUnidade: ${item.equipamento.unidade?.nomeSistema || 'N/A'}`,
         item.tecnicoResponsavel || 'N/A',
         item.descricaoProblemaServico || '-'
    ]);
    configuracaoColunas = { 0: { cellWidth: 35, halign: 'center' }, 1: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' } };
  }
  
  adicionarCabecalho(doc, tituloRelatorio);
  
  autoTable(doc, {
    head: headers,
    body: body,
    startY: 60,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8.5, halign: 'center', valign: 'middle' },
    bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], valign: 'top' },
    columnStyles: configuracaoColunas,
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.text(`Página ${data.pageNumber}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
  });
  
  doc.save(`${nomeArquivo}.pdf`);
};

/**
 * 4. PDF DE INDICADORES BI (Design Executivo)
 */
export const exportarBIPDF = (dados) => {
  const doc = new jsPDF();
  adicionarCabecalho(doc, `RELATÓRIO EXECUTIVO DE PERFORMANCE - ${dados.ano}`);
  
  autoTable(doc, {
    head: [['INDICADOR OPERACIONAL', 'VALOR ACUMULADO']],
    body: [
      ['TOTAL DE ATIVOS NO SISTEMA', dados.resumoGeral.totalAtivos],
      ['MANUTENÇÕES PREVENTIVAS REALIZADAS', dados.resumoGeral.preventivas],
      ['MANUTENÇÕES CORRETIVAS (PARADAS)', dados.resumoGeral.corretivas]
    ],
    startY: 65,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 10 },
    bodyStyles: { fontStyle: 'bold', halign: 'center', fontSize: 9, cellPadding: 4 }
  });
  
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text("1. TEMPO DE PARADA (DOWNTIME) POR UNIDADE", 14, doc.lastAutoTable.finalY + 15);
  
  autoTable(doc, {
    head: [['UNIDADE / LOCAL', 'HORAS TOTAIS FORA DE OPERAÇÃO']],
    body: dados.rankingUnidades.map(u => [u.nome, `${u.horasParado} Horas`]),
    startY: doc.lastAutoTable.finalY + 20,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8.5 }
  });
  
  doc.text("2. REINCIDÊNCIA DE FALHAS (FREQUÊNCIA DE CORRETIVAS)", 14, doc.lastAutoTable.finalY + 15);
  
  autoTable(doc, {
    head: [['EQUIPAMENTO / TAG', 'UNIDADE', 'QTD. CORRETIVAS']],
    body: dados.rankingFrequencia.map(e => [`${e.modelo} (${e.tag})`, e.unidade, `${e.corretivas} vez(es)`]),
    startY: doc.lastAutoTable.finalY + 20,
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 8.5 }
  });
  
  doc.text("3. TOP 5 EQUIPAMENTOS COM MAIOR TEMPO PARADO", 14, doc.lastAutoTable.finalY + 15);
  
  autoTable(doc, {
    head: [['EQUIPAMENTO / TAG', 'UNIDADE', 'TEMPO PARADO']],
    body: dados.rankingDowntime.map(e => [`${e.modelo} (${e.tag})`, e.unidade, `${e.horasParado}h`]),
    startY: doc.lastAutoTable.finalY + 20,
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 8.5 }
  });
  
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Relatório BI SIMEC - Página ${i} de ${totalPaginas}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
  
  doc.save(`BI_ESTRATEGICO_SIMEC_${dados.ano}.pdf`);
};

/**
 * 5. PDF DE ORDEM DE SERVIÇO DETALHADA
 */
export const exportarOSManutencaoPDF = (m) => {
    const doc = new jsPDF();
    
    try { doc.addImage(logoSimec, 'PNG', 14, 10, 22, 22); } catch (e) {}
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');
    doc.text(`ORDEM DE SERVIÇO: ${m.numeroOS}`, 45, 20);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Gerado em: ${formatarDataHora(new Date())}`, 196, 15, { align: 'right' });

    doc.setFillColor(241, 245, 249);
    doc.rect(14, 35, 182, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text("INFORMAÇÕES DO EQUIPAMENTO", 16, 40);

    const nomeUnidade = m.equipamento?.unidade?.nomeSistema || m.equipamento?.unidade?.nome || 'N/A';

    autoTable(doc, {
        startY: 45,
        theme: 'plain',
        body: [
            ['MODELO:', m.equipamento?.modelo, 'Nº SÉRIE / TAG:', m.equipamento?.tag],
            ['UNIDADE:', nomeUnidade, 'TIPO:', m.tipo],
            ['Nº CHAMADO:', m.numeroChamado || 'N/A', 'STATUS ATUAL:', m.status.toUpperCase()]
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 2: { fontStyle: 'bold', cellWidth: 35 } }
    });

    doc.setFillColor(241, 245, 249);
    doc.rect(14, doc.lastAutoTable.finalY + 5, 182, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text("CRONOGRAMA E EXECUÇÃO REAL", 16, doc.lastAutoTable.finalY + 10);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        theme: 'grid',
        head: [['ETAPA', 'DATA/HORA PLANEJADA', 'DATA/HORA REAL']],
        body: [
            ['INÍCIO:', formatarDataHora(m.dataHoraAgendamentoInicio), formatarDataHora(m.dataInicioReal) || 'Não iniciado'],
            ['TÉRMINO:', formatarDataHora(m.dataHoraAgendamentoFim), formatarDataHora(m.dataFimReal) || 'Em aberto']
        ],
        headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
        styles: { fontSize: 9 }
    });

    doc.setFont(undefined, 'bold');
    doc.text("DESCRIÇÃO DO PROBLEMA / SERVIÇO:", 14, doc.lastAutoTable.finalY + 12);
    doc.setFont(undefined, 'normal');
    doc.text(doc.splitTextToSize(m.descricaoProblemaServico || 'Nenhuma descrição informada.', 180), 14, doc.lastAutoTable.finalY + 18);

    doc.setFillColor(241, 245, 249);
    doc.rect(14, doc.lastAutoTable.finalY + 40, 182, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text("HISTÓRICO DO CHAMADO / NOTAS TÉCNICAS", 16, doc.lastAutoTable.finalY + 45);

    const historicoBody = m.notasAndamento?.map(n => [formatarDataHora(n.data), n.autor?.nome || 'Sistema', n.nota]) || [['-', '-', 'Nenhuma nota registrada']];

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 50,
        head: [['DATA/HORA', 'RESPONSÁVEL', 'NOTA/ANDAMENTO']],
        body: historicoBody,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
        styles: { fontSize: 8, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 40 } }
    });

    const finalY = doc.lastAutoTable.finalY + 30;
    doc.line(14, finalY, 90, finalY);
    doc.text("Responsável Técnico", 14, finalY + 5);
    doc.line(110, finalY, 196, finalY);
    doc.text("Assinatura Unidade / Cliente", 110, finalY + 5);

    doc.save(`OS_${m.numeroOS}.pdf`);
};