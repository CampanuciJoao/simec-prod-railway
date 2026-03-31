// Ficheiro: src/utils/pdfUtils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarDataHora } from './timeUtils';
import logoSimec from '../assets/images/logo-simec-base64'; 

// Função auxiliar para criar o topo de todos os PDFs
const adicionarCabecalho = (doc, titulo) => {
    try { doc.addImage(logoSimec, 'PNG', 14, 12, 25, 25); } catch (e) {}
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${formatarDataHora(new Date())}`, 200, 18, { align: 'right' });
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(titulo, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
};

// Relatório de Auditoria (Aquele que você gera dentro do card do equipamento)
export const exportarHistoricoEquipamentoPDF = (dados, info) => {
    const doc = new jsPDF();
    adicionarCabecalho(doc, "Relatório de Auditoria de Ativo");

    doc.setFillColor(248, 250, 252);
    doc.rect(14, 42, 182, 24, 'F'); 
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 42, 182, 24, 'S');

    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.setFont(undefined, 'bold');
    doc.text(`Modelo:`, 18, 48);
    doc.text(`Nº Série (Tag):`, 18, 54);
    doc.text(`Unidade:`, 18, 60);
    
    doc.setFont(undefined, 'normal');
    doc.text(`${info.modelo || 'N/A'}`, 45, 48);
    doc.text(`${info.tag || 'N/A'}`, 45, 54);
    doc.text(`${info.unidade || 'N/A'}`, 45, 60);
    
    const periodoTxt = info.inicio || info.fim 
        ? `Período Auditado: ${info.inicio || 'Início'} até ${info.fim || 'Hoje'}` 
        : "Período: Histórico Completo";
    doc.text(periodoTxt, 110, 48);

    const headers = [["Data Execução", "Categoria", "Evento / OS", "Responsável", "Status"]];
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
        startY: 72,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 9 },
        columnStyles: {
            0: { halign: 'center', cellWidth: 35 },
            1: { halign: 'center', cellWidth: 30 },
            3: { halign: 'center' },
            4: { halign: 'center' },
        },
        styles: { fontSize: 8 }
    });

    const fileName = `auditoria_${(info.tag || 'Equipamento').replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};

// ============================================================
// >>> NOVA FUNÇÃO DE RELATÓRIO GERAL (CORRIGIDA) <<<
// ============================================================
export const exportarRelatorioPDF = (resultado, nomeArquivo) => {
    const doc = new jsPDF();
    let headers = [];
    let body = [];
    let tituloRelatorio = "";
    let configuracaoColunas = {};

    // 1. Lógica para Relatório de INVENTÁRIO
    if (resultado.tipoRelatorio === 'inventarioEquipamentos') {
        tituloRelatorio = "Relatório de Inventário de Equipamentos";
        headers = [["Modelo", "Nº de Série", "Fabricante", "Registro ANVISA", "Status", "Unidade"]];
        body = resultado.dados.map(item => [
            item.modelo || 'N/A', 
            item.tag || 'N/A', 
            item.fabricante || 'N/A',
            item.registroAnvisa || 'N/A', 
            item.status || 'N/A', 
            item.unidade?.nomeSistema || 'N/A'
        ]);
        configuracaoColunas = {
            0: { halign: 'center' }, 1: { halign: 'center' }, 2: { halign: 'center' },
            3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }
        };
    } 
    // 2. Lógica para Relatório de MANUTENÇÕES REALIZADAS
    else if (resultado.tipoRelatorio === 'manutencoesRealizadas') {
        tituloRelatorio = "Relatório de Manutenções Realizadas";
        headers = [["OS", "Data Conclusão", "Equipamento", "Responsável", "Descrição do Serviço"]];
        body = resultado.dados.map(item => [
            item.numeroOS,
            formatarDataHora(item.dataConclusao),
            `${item.equipamento.modelo} (${item.equipamento.tag})`,
            item.tecnicoResponsavel || 'N/A',
            item.descricaoProblemaServico || '-'
        ]);
        // Ajuste de largura para a descrição não apertar os outros campos
        configuracaoColunas = {
            0: { cellWidth: 25 }, // OS
            1: { cellWidth: 35 }, // Data
            2: { cellWidth: 40 }, // Equipamento
            3: { cellWidth: 30 }, // Técnico
            4: { cellWidth: 'auto' } // Descrição (ocupa o resto)
        };
    }

    // Chama o cabeçalho com o título correto
    adicionarCabecalho(doc, tituloRelatorio);

    // Gera a tabela com quebra de linha automática (overflow: 'linebreak')
    autoTable(doc, {
        head: headers,
        body: body,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 9 },
        columnStyles: configuracaoColunas,
        styles: { fontSize: 8, overflow: 'linebreak' }
    });

    doc.save(`${nomeArquivo}.pdf`);
};