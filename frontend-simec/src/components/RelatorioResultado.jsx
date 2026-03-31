// src/components/RelatorioResultado.jsx
// VERSÃO FINAL CORRIGIDA - COM TODOS OS TIPOS DE RELATÓRIO FUNCIONAIS

import React from 'react';
import { formatarDataHora } from '../utils/timeUtils';

// Sua função utilitária para formatar o tempo de parada (mantida)
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
  if (!resultado || !resultado.dados) {
    return null;
  }

  const { tipoRelatorio, dados } = resultado;

  if (dados.length === 0) {
    return (
      <div className="no-data-message" style={{ marginTop: '30px' }}>
        Nenhum resultado encontrado para os filtros selecionados.
      </div>
    );
  }

  let headers = [];
  let renderRow = (item, index) => <tr key={index}></tr>;

  switch (tipoRelatorio) {
    // ==============================================================
    // >> CORREÇÃO APLICADA AQUI <<
    // O case para 'inventarioEquipamentos' agora mapeia os campos corretos da API.
    // ==============================================================
    case 'inventarioEquipamentos':
      headers = ["Modelo", "Nº de Série (Tag)", "Fabricante", "Registro ANVISA", "Status", "Unidade"];
      renderRow = (item, index) => (
        <tr key={index}>
          <td>{item.modelo}</td>
          <td>{item.tag}</td>
          <td>{item.fabricante || 'N/A'}</td>
          <td>{item.registroAnvisa || 'N/A'}</td>
          <td>{item.status || 'N/A'}</td>
          <td>{item.unidade?.nomeSistema || 'N/A'}</td>
        </tr>
      );
      break;

    // Lógica para 'tempoParada' mantida do seu código original
    case 'tempoParada':
      headers = ["Equipamento", "Nº OS", "Nº Chamado", "Início da Parada", "Fim da Parada", "Tempo Parado"];
      renderRow = (item, index) => (
        <tr key={index}>
          <td>{item.equipamentoNome} ({item.equipamentoId})</td>
          <td>{item.numeroOS}</td>
          <td>{item.numeroChamado || 'N/A'}</td>
          <td>{formatarDataHora(item.dataInicio)}</td>
          <td>{formatarDataHora(item.dataFim)}</td>
          <td>{formatarHorasParaHumanos(item.tempoParadaHoras)}</td>
        </tr>
      );
      break;
    
    // Lógica para 'manutencoesRealizadas' corrigida para usar os campos da API
    case 'manutencoesRealizadas':
      headers = ["Nº OS", "Data Conclusão", "Equipamento", "Técnico", "Descrição do Serviço"];
      renderRow = (item, index) => (
        <tr key={index}>
          <td style={{ fontWeight: 'bold' }}>{item.numeroOS}</td>
          <td>{formatarDataHora(item.dataConclusao)}</td>
          <td>{`${item.equipamento.modelo} (${item.equipamento.tag})`}</td>
          <td>{item.tecnicoResponsavel || 'N/A'}</td>
          <td style={{ maxWidth: '300px', fontSize: '0.85rem' }}>{item.descricaoProblemaServico || '-'}</td>
        </tr>
      );
      break;

    default:
      return <p className="form-error" style={{marginTop: '20px'}}>Tipo de relatório desconhecido ou não implementado: {tipoRelatorio}</p>;
  }

  return (
    <div className="table-responsive-wrapper" style={{marginTop: '20px'}}>
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header) => <th key={header}>{header}</th>)}
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