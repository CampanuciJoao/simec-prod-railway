// Ficheiro: src/utils/pdfUtils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarDataHora } from './timeUtils';
import logoSimec from '../assets/images/logo-simec-base64'; 

// Função auxiliar para o cabeçalho (padrão da empresa)
const adicionarCabecalho = (doc, titulo) => {
    try {
        doc.addImage(logoSimec, 'PNG', 14, 12, 25, 25);
    } catch (e) {
        console.warn("Logo não encontrado ou formato inválido");
    }
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${formatarDataHora(new Date())}`, 200, 18, { align: 'right' });
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(titulo, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
};

/**
 * Exporta Relatórios Gerais (Inventário, Manutenções)
 */
export const exportarRelatorioPDF = (resultado, nomeArquivo) => {
    const doc = new jsPDF();
    let headers = [["Modelo", "Nº de Série", "Fabricante", "Registro ANVISA", "Status", "Unidade"]];
    let body = resultado.dados.map(item => [
        item.modelo || 'N/A',
        item.tag || 'N/A',
        item.fabricante || 'N/A',
        item.registroAnvisa || 'N/A',
        item.status || 'N/A',
        item.unidade?.nomeSistema || 'N/A'
    ]);

    adicionarCabecalho(doc, "Relatório de Inventário");
    autoTable(doc, {
        head: headers,
        body: body,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { halign: 'center' }, 1: { halign: 'center' }, 2: { halign: 'center' },
            3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' },
        }
    });
    doc.save(`${nomeArquivo}.pdf`);
};

/**
 * Exporta o Histórico Unificado de Auditoria
 */
export const exportarHistoricoEquipamentoPDF = (dados, info) => {
    const doc = new jsPDF();
    
    // PROTEÇÃO: Garante que nome nunca seja undefined para evitar erro de .replace()
    const nomeSeguro = info.nome || 'Equipamento';

    adicionarCabecalho(doc, "Relatório de Auditoria de Ativo");

    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Equipamento: ${nomeSeguro}`, 14, 48);
    
    const periodoTxt = info.inicio || info.fim 
        ? `Período: ${info.inicio || 'Início'} até ${info.fim || 'Hoje'}` 
        : "Período: Histórico Completo";
    doc.text(periodoTxt, 14, 54);

    const headers = [["Data / Hora", "Origem", "Evento / OS", "Responsável", "Status"]];
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
        headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 35 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'left' },
            3: { halign: 'center' },
            4: { halign: 'center' },
        },
        styles: { fontSize: 8 }
    });

    // Nome do arquivo sem espaços
    const fileName = `auditoria_${nomeSeguro.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};