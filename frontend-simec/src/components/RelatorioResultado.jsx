// src/components/RelatorioResultado.jsx
// VERSÃO ATUALIZADA - COM ALINHAMENTO CORRIGIDO E DESCRITIVO DE SERVIÇO

import React from 'react';
import { formatarDataHora } from '../utils/timeUtils';

/**
 * Formata o tempo de parada para exibição amigável.
 */
const formatarHorasParaHumanos = (totalHoras) => {
    if (typeof totalHoras !== 'number' || totalHoras < 0) return 'N/A';
    const horas = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - horas) * 60);
    let resultado = '';
    if (horas > 0) resultado += `${horas}h `;
    if (minutos > 0) resultado += `${minutos}m`;
    return resultado.trim() || '0m';
};

function RelatorioResultado({ resultado }) {
  // Verifica se existem dados para exibir
  if (!resultado || !resultado.dados || resultado.dados.length === 0) {
    return (
      <div className="no-data-message" style={{ marginTop: '30px' }}>
        Nenhum resultado encontrado para os filtros selecionados.
      </div>
    );
  }

  const { tipoRelatorio, dados } = resultado;

  let headers = [];
  let renderRow = (item, index) => <tr key={index}></tr>;

  // Lógica de montagem da tabela baseada no tipo de relatório
  switch (tipoRelatorio) {
    
    case 'inventarioEquipamentos':
      headers = ["Modelo", "Nº Série (Tag)", "Fabricante", "Registro ANVISA", "Status", "Unidade"];
      renderRow = (item, index) => (
        <tr key={index}>
          <td className="text-left">{item.modelo}</td>
          <td className="text-center">{item.tag}</td>
          <td className="text-center">{item.fabricante || 'N/A'}</td>
          <td className="text-center">{item.registroAnvisa || 'N/A'}</td>
          <td className="text-center"><span className={`status-badge status-${item.status?.toLowerCase()}`}>{item.status}</span></td>
          <td className="text-left">{item.unidade?.nomeSistema || 'N/A'}</td>
        </tr>
      );
      break;

    case 'manutencoesRealizadas':
      headers = ["Nº OS / Chamado", "Conclusão", "Equipamento / Unidade", "Responsável", "Descrição do Serviço"];
      renderRow = (item, index) => (
        <tr key={index}>
          <td className="text-center">
            <div style={{ fontWeight: 'bold' }}>{item.numeroOS}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.numeroChamado ? `Chamado: ${item.numeroChamado}` : '-'}</div>
          </td>
          <td className="text-center">{formatarDataHora(item.dataConclusao)}</td>
          <td className="text-left">
            <div style={{ fontWeight: 'bold' }}>{item.equipamento.modelo} ({item.equipamento.tag})</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Unidade: {item.equipamento.unidade?.nomeSistema}</div>
          </td>
          <td className="text-center">{item.tecnicoResponsavel || 'N/A'}</td>
          <td className="text-left" style={{ fontSize: '0.85rem', maxWidth: '300px' }}>{item.descricaoProblemaServico || '-'}</td>
        </tr>
      );
      break;

    case 'tempoParada':
      headers = ["Equipamento", "Nº OS", "Início", "Fim", "Total Parado"];
      renderRow = (item, index) => (
        <tr key={index}>
          <td className="text-left">{item.equipamentoNome} ({item.equipamentoId})</td>
          <td className="text-center">{item.numeroOS}</td>
          <td className="text-center">{formatarDataHora(item.dataInicio)}</td>
          <td className="text-center">{formatarDataHora(item.dataFim)}</td>
          <td className="text-center" style={{ fontWeight: 'bold', color: '#ef4444' }}>{formatarHorasParaHumanos(item.tempoParadaHoras)}</td>
        </tr>
      );
      break;

    default:
      return <p className="form-error">Tipo de relatório não implementado.</p>;
  }

  return (
    <div className="table-responsive-wrapper" style={{ marginTop: '20px' }}>
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => {
                // Define se o título da coluna deve estar à esquerda ou no centro
                const alignClass = (h === "Equipamento" || h === "Descrição do Serviço" || h === "Modelo" || h === "Unidade") 
                    ? "text-left" 
                    : "text-center";
                return <th key={h} className={alignClass}>{h}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {dados.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}

export default RelatorioResultado;