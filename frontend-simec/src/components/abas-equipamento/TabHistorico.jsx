// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO 12.5 - FINAL CORRIGIDA (LAYOUT VERTICAL E AUDITORIA COMPLETA)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getManutencoes, getOcorrenciasPorEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { exportarHistoricoEquipamentoPDF } from '../../utils/pdfUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faSpinner, faFilePdf, faCalendarDay, 
  faChevronDown, faChevronUp, faTools, faCheckCircle, 
  faExclamationTriangle, faInfoCircle, faUser, faWrench
} from '@fortawesome/free-solid-svg-icons';
import DateInput from '../DateInput';

function TabHistorico({ equipamento }) {
  const { addToast } = useToast();
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  
  // Estados para o Filtro de Auditoria
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const carregarDados = useCallback(async () => {
    if (!equipamento?.id) return;
    setLoading(true);
    try {
      const [manuts, ocorrs] = await Promise.all([
        getManutencoes({ equipamentoId: equipamento.id }),
        getOcorrenciasPorEquipamento(equipamento.id)
      ]);
      setHistoricoBruto({ manutencoes: manuts || [], ocorrencias: ocorrs || [] });
    } catch (error) {
      addToast('Erro ao carregar histórico.', 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id, addToast]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const toggleExpandir = (id) => {
    const novosExpandidos = new Set(itensExpandidos);
    if (novosExpandidos.has(id)) {
      novosExpandidos.delete(id);
    } else {
      novosExpandidos.add(id);
    }
    setItensExpandidos(novosExpandidos);
  };

  const linhaDoTempo = useMemo(() => {
    const m = (historicoBruto.manutencoes || []).map(item => ({
      uniqueId: `os-${item.id}`,
      data: item.dataConclusao || item.dataHoraAgendamentoInicio, 
      tipo: 'Manutenção',
      categoria: item.tipo, 
      titulo: `OS: ${item.numeroOS}`,
      descricao: item.descricaoProblemaServico,
      responsavel: item.tecnicoResponsavel || 'N/A',
      status: item.status,
      isOS: true
    }));

    const o = (historicoBruto.ocorrencias || []).map(item => ({
      uniqueId: `oc-${item.id}`,
      data: item.dataResolucao || item.data, 
      tipo: 'Ocorrência',
      categoria: 'Evento / Ocorrência',
      titulo: item.titulo,
      descricao: item.descricao,
      responsavel: item.tecnicoResolucao || item.tecnico || 'N/A',
      status: item.resolvido ? 'Resolvido' : 'Pendente',
      isOS: false,
      solucao: item.solucao
    }));

    let unificado = [...m, ...o];

    // Filtro de Data com correção de fim de dia (23:59:59)
    if (dataInicio) {
        const dIni = new Date(dataInicio + 'T00:00:00');
        unificado = unificado.filter(item => new Date(item.data) >= dIni);
    }
    if (dataFim) {
        const dFim = new Date(dataFim + 'T23:59:59');
        unificado = unificado.filter(item => new Date(item.data) <= dFim);
    }

    return unificado.sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [historicoBruto, dataInicio, dataFim]);

  const handleSetHoje = (campo) => {
    const hoje = new Date().toISOString().split('T')[0];
    if (campo === 'inicio') setDataInicio(hoje);
    if (campo === 'fim') setDataFim(hoje);
  };

  const handleExportar = () => {
    if (linhaDoTempo.length === 0) return addToast('Não há dados no período selecionado.', 'info');
    exportarHistoricoEquipamentoPDF(linhaDoTempo, {
        modelo: equipamento.modelo,
        tag: equipamento.tag,
        unidade: equipamento.unidade?.nomeSistema,
        inicio: dataInicio,
        fim: dataFim
    });
  };

  return (
    <div className="unified-history-wrapper">
      <div className="tab-header-action">
        {/* TÍTULO NO TOPO (Agora em linha única e separada) */}
        <h3 className="tab-inner-title">
          <FontAwesomeIcon icon={faHistory} /> AUDITORIA DO ATIVO
        </h3>
        
        {/* BARRA DE FILTRO (Abaixo do título, ocupa 100% da largura) */}
        <div className="audit-filter-bar">
            <div className="filter-group">
                <label>Data Inicial</label>
                <div className="input-with-button">
                    <DateInput value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    <button type="button" className="btn-today" onClick={() => handleSetHoje('inicio')}>H</button>
                </div>
            </div>

            <div className="filter-group">
                <label>Data Final</label>
                <div className="input-with-button">
                    <DateInput value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                    <button type="button" className="btn-today" onClick={() => handleSetHoje('fim')}>H</button>
                </div>
            </div>

            <div className="filter-actions-group">
                <button className="btn btn-danger btn-pdf" onClick={handleExportar}>
                    <FontAwesomeIcon icon={faFilePdf} /> Gerar PDF Auditável
                </button>
                {(dataInicio || dataFim) && (
                    <button className="btn-clear" onClick={() => { setDataInicio(''); setDataFim(''); }}>Limpar</button>
                )}
            </div>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign: 'center', padding: '40px'}}><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>
      ) : (
        <div className="timeline-cards-list">
          {linhaDoTempo.length === 0 ? (
              <p className="no-data-message">Nenhum registro de execução encontrado para este período.</p>
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
                        {/* title-group resolve a sobreposição de texto colocando data sobre o título */}
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
                                {item.solucao && (
                                    <p style={{color: '#10b981', marginTop: '10px'}}>
                                        <strong><FontAwesomeIcon icon={faCheckCircle} /> Solução Técnica:</strong> {item.solucao}
                                    </p>
                                )}
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