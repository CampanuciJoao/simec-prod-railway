// Ficheiro: src/utils/pdfUtils.js
// VERSÃO FINAL CONSOLIDADA - SUPORTE A RELATÓRIOS GERAIS E BI

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarDataHora } from './timeUtils';
import logoSimec from '../assets/images/logo-simec-base64'; 

/**
 * Função interna para gerar o cabeçalho padrão de todos os relatórios.
 */
const adicionarCabecalho = (doc, titulo) => {
    try { doc.addImage(logoSimec, 'PNG', 14, 10, 22, 22); } catch (e) {}
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${formatarDataHora(new Date())}`, 200, 18, { align: 'right' });
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Cor azul escura padrão do SIMEC
    doc.setFont(undefined, 'bold');
    doc.text(titulo, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
};

/**
 * 1. PDF de Auditoria do Ativo (Histórico Individual do Equipamento).
 */
export const exportarHistoricoEquipamentoPDF = (dados, info) => {
    const doc = new jsPDF();
    adicionarCabecalho(doc, "RELATÓRIO DE AUDITORIA DE ATIVO");

    doc.setFillColor(248, 250, 252);
    doc.rect(14, 42, 182, 22, 'F'); 
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 42, 182, 22, 'S');

    doc.setFontSize(9);
    doc.setTextColor(30);
    doc.setFont(undefined, 'bold');
    doc.text(`EQUIPAMENTO:`, 18, 48);
    doc.text(`Nº SÉRIE (TAG):`, 18, 54);
    doc.text(`UNIDADE:`, 18, 60);
    
    doc.setFont(undefined, 'normal');
    doc.text(`${info.modelo || 'N/A'}`, 45, 48);
    doc.text(`${info.tag || 'N/A'}`, 45, 54);
    doc.text(`${info.unidade || 'N/A'}`, 45, 60);
    
    const periodoTxt = info.inicio || info.fim 
        ? `Período: ${info.inicio || 'Início'} até ${info.fim || 'Hoje'}` 
        : "Período: Histórico Completo";
    doc.text(periodoTxt, 120, 48);

    const headers = [["DATA EXECUÇÃO", "CATEGORIA", "EVENTO / OS", "RESPONSÁVEL", "STATUS"]];
    const body = dados.map(item => [
        formatarDataHora(item.data),
        item.categoria, 
        item.titulo,
        item.responsavel || 'N/A',
        item.status
    ]);

    autoTable(doc, {
        head: headers,
        body: body,
        startY: 70,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 3 },
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' }, 4: { halign: 'center' } }
    });

    doc.save(`auditoria_${(info.tag || 'Equipamento')}.pdf`);
};

/**
 * 2. PDF dos Relatórios Gerais (Inventário e Manutenções Realizadas).
 */
export const exportarRelatorioPDF = (resultado, nomeArquivo) => {
    const doc = new jsPDF();
    let headers = [];
    let body = [];
    let tituloRelatorio = "";
    let configuracaoColunas = {};

    // Caso A: Inventário
    if (resultado.tipoRelatorio === 'inventarioEquipamentos') {
        tituloRelatorio = "RELATÓRIO DE INVENTÁRIO DE ATIVOS";
        headers = [["MODELO", "SÉRIE / TAG", "FABRICANTE", "REGISTRO ANVISA", "STATUS", "UNIDADE"]];
        body = resultado.dados.map(item => [
            item.modelo || 'N/A', 
            item.tag || 'N/A', 
            item.fabricante || 'N/A',
            item.registroAnvisa || 'N/A', 
            item.status || 'N/A', 
            item.unidade?.nomeSistema || 'N/A'
        ]);
        configuracaoColunas = {
            0: { cellWidth: 40 }, 1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' }
        };
    } 
    // Caso B: Manutenções (Com Chamado e Unidade empilhados)
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

        configuracaoColunas = {
            0: { cellWidth: 35, halign: 'center' }, 
            1: { cellWidth: 32, halign: 'center' }, 
            2: { cellWidth: 45 }, 
            3: { cellWidth: 30, halign: 'center' }, 
            4: { cellWidth: 'auto' } 
        };
    }

    adicionarCabecalho(doc, tituloRelatorio);

    autoTable(doc, {
        head: headers,
        body: body,
        startY: 48,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], fontSize: 8.5, halign: 'center', valign: 'middle', cellPadding: 3 },
        bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], valign: 'top', cellPadding: 3 },
        columnStyles: configuracaoColunas,
        styles: { overflow: 'linebreak' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.text(`Página ${data.pageNumber}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
    });

    doc.save(`${nomeArquivo}.pdf`);
};

/**
 * 3. PDF de Indicadores BI (Performance Anual).
 */
export const exportarBIPDF = (dados) => {
    const doc = new jsPDF();
    adicionarCabecalho(doc, `INDICADORES DE PERFORMANCE - ANO ${dados.ano}`);

    // Quadro de Resumo Geral
    autoTable(doc, {
        head: [['INDICADOR ESTRATÉGICO', 'QUANTIDADE TOTAL']],
        body: [
            ['MANUTENÇÕES PREVENTIVAS REALIZADAS', dados.resumo.totalPreventivas],
            ['MANUTENÇÕES CORRETIVAS (PARADAS)', dados.resumo.totalCorretivas]
        ],
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], halign: 'center' }, // Verde
        bodyStyles: { fontStyle: 'bold', halign: 'center' }
    });

    // Tabela de Ranking de Paradas
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text("RANKING DE TEMPO DE PARADA (DOWNTIME)", 14, doc.lastAutoTable.finalY + 15);

    autoTable(doc, {
        head: [['EQUIPAMENTO / TAG', 'UNIDADE', 'TEMPO TOTAL PARADO']],
        body: dados.rankingDowntime.map(e => [
            `${e.modelo} (${e.tag})`, 
            e.unidade, 
            `${e.horasParado} Horas`
        ]),
        startY: doc.lastAutoTable.finalY + 20,
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68], halign: 'center' }, // Vermelho
        styles: { fontSize: 8, cellPadding: 3 }
    });

    // Rodapé
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Relatório BI SIMEC - Página ${i} de ${totalPaginas}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`BI_SIMEC_${dados.ano}.pdf`);
};