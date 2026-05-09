// src/utils/exportUtils.js
// CÓDIGO COMPLETO E ATUALIZADO

import { formatarData, formatarDataHora } from './timeUtils'; // Importa as funções de formatação

// Função auxiliar para escapar caracteres especiais no CSV
function escapeCSV(str) {
    if (str === null || str === undefined) {
        return '';
    }
    const s = String(str);
    if (s.search(/("|,|\n)/g) >= 0) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

/**
 * Cria e baixa um relatório CSV estruturado com base no objeto de resultado da API.
 * @param {object} relatorio - O objeto de resultado completo vindo da API.
 * @param {string} nomeArquivo - O nome do arquivo a ser baixado (sem a extensão .csv).
 */
export const exportarRelatorioCSV = (relatorio, nomeArquivo, timezone = 'UTC') => {
    if (!relatorio || !relatorio.dados || relatorio.dados.length === 0) {
        console.error("Não há dados para exportar.");
        // Idealmente, a página que chama já fez essa verificação, mas é uma boa prática ter aqui também.
        return;
    }

    const { tipoRelatorio, dados, filtros, periodo } = relatorio;
    let headers = [];
    let dadosFormatados = [];
    let tituloRelatorio = 'Relatório';
    let filtrosUtilizados = [];

    // Lógica para processar cada tipo de relatório
    switch (tipoRelatorio) {
        case 'inventarioEquipamentos':
            tituloRelatorio = 'Relatório de Inventário de Equipamentos';
            headers = ["Modelo", "Numero de Serie", "Fabricante", "Registro ANVISA", "Unidade"];
            // Os dados já vêm no formato correto, então só precisamos mapear
            dadosFormatados = dados.map(item => [
                escapeCSV(item.modelo),
                escapeCSV(item.numeroSerie),
                escapeCSV(item.fabricante),
                escapeCSV(item.registroAnvisa),
                escapeCSV(item.unidade)
            ]);
            filtrosUtilizados = [
                { label: 'Unidade', value: filtros.unidade || 'Todas' },
                { label: 'Fabricante', value: filtros.fabricante || 'Todos' }
            ];
            break;

        case 'manutencoesRealizadas':
            tituloRelatorio = 'Relatório de Manutenções Realizadas';
            headers = ["Equipamento", "Nº OS", "Tipo Manutenção", "Técnico", "Data de Conclusão"];
            dadosFormatados = dados.map(item => [
                escapeCSV(`${item.equipamentoNome} (${item.equipamentoId})`),
                escapeCSV(item.numeroOS),
                escapeCSV(item.tipoManutencao),
                escapeCSV(item.tecnico || 'N/A'),
                escapeCSV(formatarDataHora(item.dataConclusao))
            ]);
            filtrosUtilizados = [
                { label: 'Período', value: `${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}` },
                { label: 'Unidade', value: filtros.unidade || 'Todas' },
                { label: 'Tipo de Manutenção', value: filtros.tipoManutencao || 'Todas' }
            ];
            break;

        case 'tempoParada':
             tituloRelatorio = 'Relatório de Tempo de Parada de Equipamentos';
             headers = ["Equipamento", "Nº OS", "Início da Parada", "Fim da Parada", "Tempo Parado (Horas)"];
             dadosFormatados = dados.map(item => [
                escapeCSV(`${item.equipamentoNome} (${item.equipamentoId})`),
                escapeCSV(item.numeroOS),
                escapeCSV(formatarDataHora(item.dataInicio)),
                escapeCSV(formatarDataHora(item.dataFim)),
                escapeCSV(item.tempoParadaHoras.toFixed(2))
             ]);
             filtrosUtilizados = [
                { label: 'Período', value: `${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}` },
                { label: 'Unidade', value: filtros.unidade || 'Todas' }
            ];
            break;
            
        case 'equipamentosServicos': {
            tituloRelatorio = 'Relatório de Equipamentos e Serviços Vinculados';
            headers = [
                'Unidade', 'Modelo', 'Tipo', 'Tag', 'Status', 'Fabricante',
                'Setor', 'Nº Patrimônio', 'Registro ANVISA',
                'Qtd. Contratos', 'Nº(s) Contrato', 'Fornecedor(es)', 'Vencimento Contrato',
                'Qtd. Seguros', 'Nº Apólice(s)', 'Seguradora(s)', 'Vencimento Seguro',
                'Total Manutenções', 'Última Manutenção (Tipo)', 'Data Última Manutenção',
            ];

            const fmt = (dt) => dt ? formatarData(dt) : 'N/A';
            const join = (arr) => arr.length > 0 ? arr.join(' | ') : 'Nenhum';

            dadosFormatados = dados.map((eq) => {
                const contratos = eq.contratosCobertos || [];
                const seguros = eq.seguros || [];
                const manutencoes = eq.manutencoes || [];

                const segurosAtivos = seguros.filter(
                    (s) => s.status === 'Ativo' || s.status === 'Vigente'
                );
                const ultimaManutencao = manutencoes.find((m) => m.dataConclusao);

                return [
                    escapeCSV(eq.unidade?.nomeSistema || 'N/A'),
                    escapeCSV(eq.modelo),
                    escapeCSV(eq.tipo || 'N/A'),
                    escapeCSV(eq.tag || 'N/A'),
                    escapeCSV(eq.status),
                    escapeCSV(eq.fabricante || 'N/A'),
                    escapeCSV(eq.setor || 'N/A'),
                    escapeCSV(eq.numeroPatrimonio || 'N/A'),
                    escapeCSV(eq.registroAnvisa || 'N/A'),
                    escapeCSV(contratos.length),
                    escapeCSV(join(contratos.map((c) => c.numeroContrato))),
                    escapeCSV(join([...new Set(contratos.map((c) => c.fornecedor).filter(Boolean))])),
                    escapeCSV(join(contratos.map((c) => fmt(c.dataFim)))),
                    escapeCSV(segurosAtivos.length),
                    escapeCSV(join(segurosAtivos.map((s) => s.apoliceNumero))),
                    escapeCSV(join([...new Set(segurosAtivos.map((s) => s.seguradora).filter(Boolean))])),
                    escapeCSV(join(segurosAtivos.map((s) => fmt(s.dataFim)))),
                    escapeCSV(manutencoes.length),
                    escapeCSV(ultimaManutencao?.tipo || 'N/A'),
                    escapeCSV(ultimaManutencao ? fmt(ultimaManutencao.dataConclusao) : 'N/A'),
                ];
            });

            filtrosUtilizados = [
                { label: 'Unidade', value: filtros.unidadeId || 'Todas' },
                { label: 'Tipo', value: filtros.tipo || 'Todos' },
                { label: 'Fabricante', value: filtros.fabricante || 'Todos' },
                { label: 'Status', value: filtros.status || 'Todos' },
            ];
            break;
        }

        default:
            console.error(`Tipo de relatório desconhecido: ${tipoRelatorio}`);
            return;
    }

    // --- Montagem do Conteúdo do CSV ---
    let csvContent = [];
    csvContent.push(`"${tituloRelatorio}"`);
    csvContent.push(`"Gerado em: ${formatarDataHora(new Date().toISOString(), { timeZone: timezone })}"`);
    csvContent.push(''); 
    csvContent.push('"Filtros Aplicados:"');
    filtrosUtilizados.forEach(filtro => {
        csvContent.push(`"${filtro.label}:","${filtro.value}"`);
    });
    csvContent.push('');
    csvContent.push(headers.join(','));

    // Adiciona as linhas de dados já formatadas
    dadosFormatados.forEach(row => {
        csvContent.push(row.join(','));
    });

    // --- Criação e Download do Arquivo ---
    const csvString = csvContent.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // \uFEFF para compatibilidade com Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${nomeArquivo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};