// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO 12.0 - HISTÓRICO AUDITÁVEL COM FILTRO DE DATA E EXPORTAÇÃO PDF

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getManutencoes, getOcorrenciasPorEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { exportarHistoricoEquipamentoPDF } from '../../utils/pdfUtils'; // Vamos criar esta função
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faSpinner, faFilePdf, faFilter,
  faWrench, faCheckCircle, faExclamationTriangle, faChevronDown, faChevronUp, faUser, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import DateInput from '../DateInput';

function TabHistorico({ equipamentoId, equipamentoNome }) {
  const { addToast } = useToast();
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  
  // Estados para o Filtro de Auditoria
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const carregarTudo = useCallback(async () => {
    if (!equipamentoId) return;
    setLoading(true);
    try {
      const [manuts, ocorrs] = await Promise.all([
        getManutencoes({ equipamentoId }),
        getOcorrenciasPorEquipamento(equipamentoId)
      ]);
      setHistoricoBruto({ manutencoes: manuts || [], ocorrencias: ocorrs || [] });
    } catch (error) {
      addToast('Erro ao carregar histórico.', 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, addToast]);

  useEffect(() => { carregarTudo(); }, [carregarTudo]);

  const toggleExpandir = (id) => {
    const novosExpandidos = new Set(itensExpandidos);
    novosExpandidos.has(id) ? novosExpandidos.delete(id) : novosExpandidos.add(id);
    setItensExpandidos(novosExpandidos);
  };

  // LÓGICA DE FILTRAGEM E MISTURA
  const linhaDoTempo = useMemo(() => {
    const m = historicoBruto.manutencoes.map(item => ({
      uniqueId: `os-${item.id}`,
      data: item.dataHoraAgendamentoInicio,
      tipo: 'Manutenção',
      categoria: item.tipo,
      titulo: `OS: ${item.numeroOS}`,
      descricao: item.descricaoProblemaServico,
      responsavel: item.tecnicoResponsavel || 'N/A',
      status: item.status,
      isOS: true
    }));

    const o = historicoBruto.ocorrencias.map(item => ({
      uniqueId: `oc-${item.id}`,
      data: item.data,
      tipo: 'Ocorrência',
      categoria: item.tipo,
      titulo: item.titulo,
      descricao: item.descricao,
      responsavel: item.tecnico || 'N/A',
      status: item.resolvido ? 'Resolvido' : 'Pendente',
      isOS: false,
      solucao: item.solucao // Campo extra para o PDF
    }));

    let unificado = [...m, ...o];

    // Aplicar Filtro de Data
    if (dataInicio) {
        unificado = unificado.filter(item => new Date(item.data) >= new Date(dataInicio));
    }
    if (dataFim) {
        const dFim = new Date(dataFim);
        dFim.setHours(23, 59, 59);
        unificado = unificado.filter(item => new Date(item.data) <= dFim);
    }

    return unificado.sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [historicoBruto, dataInicio, dataFim]);

  const handleExportarPDF = () => {
    if (linhaDoTempo.length === 0) {
        return addToast('Não há dados para exportar no período selecionado.', 'info');
    }
    exportarHistoricoEquipamentoPDF(linhaDoTempo, { 
        nome: equipamentoNome, 
        inicio: dataInicio, 
        fim: dataFim 
    });
  };

  return (
    <div className="unified-history-wrapper">
      <div className="tab-header-action" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '15px'}}>
        <h3 className="tab-inner-title"><FontAwesomeIcon icon={faHistory} /> Auditoria do Ativo</h3>
        
        {/* BARRA DE FILTRO DE AUDITORIA */}
        <div className="audit-filter-bar" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', width: '100%', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Data Inicial</label>
                <DateInput value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Data Final</label>
                <DateInput value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <button className="btn btn-danger" onClick={handleExportarPDF} style={{ height: '42px' }}>
                <FontAwesomeIcon icon={faFilePdf} /> Gerar Relatório de Auditoria
            </button>
            {(dataInicio || dataFim) && (
                <button className="btn btn-secondary" onClick={() => { setDataInicio(''); setDataFim(''); }} style={{ height: '42px' }}>Limpar</button>
            )}
        </div>
      </div>

      {loading ? (
        <div className="loader-container" style={{textAlign: 'center', padding: '40px'}}><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>
      ) : (
        <div className="timeline-cards-list">
          {linhaDoTempo.length === 0 ? (
              <p className="no-data-message">Nenhum registro encontrado para este período.</p>
          ) : (
            linhaDoTempo.map((item) => {
                const expandido = itensExpandidos.has(item.uniqueId);
                const isPendente = !item.isOS && item.status === 'Pendente';

                return (
                <div key={item.uniqueId} className={`history-card-new ${item.isOS ? 'os-border' : (isPendente ? 'pendente-border' : 'resolvido-border')}`}>
                    <div className="history-card-header-new" onClick={() => toggleExpandir(item.uniqueId)}>
                    <div className="card-header-left">
                        <div className={`icon-circle ${item.isOS ? 'os-icon' : (isPendente ? 'pendente-icon' : 'resolvido-icon')}`}>
                        <FontAwesomeIcon icon={item.isOS ? faWrench : (item.status === 'Resolvido' ? faCheckCircle : faExclamationTriangle)} />
                        </div>
                        <div className="title-group">
                        <span className="card-date">{formatarDataHora(item.data)}</span>
                        <h4 className="card-title">{item.titulo}</h4>
                        </div>
                    </div>
                    <div className="card-header-right">
                        <span className={`type-badge ${item.isOS ? 'os-badge' : 'oc-badge'}`}>{item.categoria}</span>
                        <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} className="chevron-icon" />
                    </div>
                    </div>

                    {expandido && (
                    <div className="history-card-body-new">
                        <div className="content-section">
                        <p><strong><FontAwesomeIcon icon={faInfoCircle} /> Detalhes:</strong> {item.descricao || 'Sem detalhes informados.'}</p>
                        <p><strong><FontAwesomeIcon icon={faUser} /> Responsável:</strong> {item.responsavel}</p>
                        {item.solucao && <p style={{color: '#10b981'}}><strong><FontAwesomeIcon icon={faCheckCircle} /> Solução:</strong> {item.solucao}</p>}
                        </div>
                    </div>
                    )}
                </div>
                );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default TabHistorico;