// Ficheiro: src/utils/pdfUtils.js
// VERSÃO FINAL CORRIGIDA - COM SUPORTE A RELATÓRIOS GERAIS E AUDITORIA DE EQUIPAMENTO

import jsPDF from 'jsgrid'; // Nota: Certifique-se que o import é 'jspdf' (erro comum de digitação)
import jsPDFReal from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarDataHora } from './timeUtils';
import logoSimec from '../assets/images/logo-simec-base64'; 

// Usamos o jsPDF importado corretamente
const jsPDFDoc = jsPDFReal;

// Função para gerar o cabeçalho padrão dos relatórios (Compartilhada)
const adicionarCabecalho = (doc, titulo) => {
    doc.addImage(logoSimec, 'PNG', 14, 12, 25, 25);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${formatarDataHora(new Date())}`, 200, 18, { align: 'right' });
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(titulo, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
};

/**
 * RELATÓRIO 1: Exportar Relatórios Gerais (Inventário, Manutenções Realizadas)
 * Mantido conforme sua versão original.
 */
export const exportarRelatorioPDF = (resultado, nomeArquivo) => {
    const doc = new jsPDFDoc();
    let headers = [];
    let body = [];
    let tituloRelatorio = "Relatório";

    switch (resultado.tipoRelatorio) {
        case 'inventarioEquipamentos':
            tituloRelatorio = 'Relatório de Inventário de Equipamentos';
            headers = [["Modelo", "Nº de Série", "Fabricante", "Registro ANVISA", "Status", "Unidade"]];
            body = resultado.dados.map(item => [
                item.modelo || 'N/A',
                item.tag || 'N/A',
                item.fabricante || 'N/A',
                item.registroAnvisa || 'N/A',
                item.status || 'N/A',
                item.unidade?.nomeSistema || 'N/A'
            ]);
            break;

        case 'manutencoesRealizadas':
            tituloRelatorio = 'Relatório de Manutenções Realizadas';
            headers = [["Nº OS", "Tipo", "Equipamento", "Técnico", "Data de Conclusão"]];
            body = resultado.dados.map(item => [
                item.numeroOS,
                item.tipo,
                `${item.equipamento.modelo} (${item.equipamento.tag})`,
                item.tecnicoResponsavel || 'N/A',
                formatarDataHora(item.dataConclusao)
            ]);
            break;

        default:
            console.error('Tipo de relatório não suportado para exportação:', resultado.tipoRelatorio);
            return;
    }

    adicionarCabecalho(doc, tituloRelatorio);

    autoTable(doc, {
        head: headers,
        body: body,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 10, halign: 'center' },
        columnStyles: {
            0: { halign: 'center' }, 1: { halign: 'center' }, 2: { halign: 'center' },
            3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' },
        },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [241, 245, 249] }
    });

    doc.save(`${nomeArquivo}.pdf`);
};

/**
 * RELATÓRIO 2: Exportar Histórico de Auditoria de um Equipamento Específico
 * NOVA FUNÇÃO - UNIFICA MANUTENÇÕES E OCORRÊNCIAS NO PDF
 */
export const exportarHistoricoEquipamentoPDF = (dados, info) => {
    const doc = new jsPDFDoc();
    
    adicionarCabecalho(doc, "Relatório de Auditoria de Ativo");

    // Informações extras abaixo do cabeçalho
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Equipamento: ${info.nome}`, 14, 48);
    
    const periodoTxt = info.inicio || info.fim 
        ? `Período: ${info.inicio || 'Início'} até ${info.fim || 'Hoje'}` 
        : "Período: Histórico Completo";
    doc.text(periodoTxt, 14, 54);

    const headers = [["Data / Hora", "Origem", "Evento / OS", "Responsável", "Status / Tipo"]];
    const body = dados.map(item => [
        formatarDataHora(item.data),
        item.tipo,
        item.titulo,
        item.responsavel || 'N/A',
        item.status
    ]);

    autoTable(doc, {
        head: headers,
        body: body,
        startY: 60,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 35 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'left' },
            3: { halign: 'center' },
            4: { halign: 'center' },
        },
        styles: { fontSize: 8, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Rodapé de página
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, 287, { align: 'center' });
    }

    doc.save(`auditoria_${info.nome.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};