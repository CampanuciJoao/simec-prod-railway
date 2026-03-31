// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO ATUALIZADA - COM SUPORTE A ANEXOS DE OS NO HISTÓRICO

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getManutencoes, getOcorrenciasPorEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { exportarHistoricoEquipamentoPDF } from '../../utils/pdfUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faSpinner, faFilePdf, faCalendarDay, 
  faChevronDown, faChevronUp, faTools, faCheckCircle, 
  faExclamationTriangle, faInfoCircle, faUser, faWrench,
  faPaperclip, faFileDownload 
} from '@fortawesome/free-solid-svg-icons';
import DateInput from '../DateInput';

// Define a URL base para buscar os arquivos no servidor
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function TabHistorico({ equipamento }) {
  const { addToast } = useToast();
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  
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
    // Processa Manutenções (OS)
    const m = (historicoBruto.manutencoes || []).map(item => ({
      uniqueId: `os-${item.id}`,
      data: item.dataConclusao || item.dataHoraAgendamentoInicio, 
      tipo: 'Manutenção',
      categoria: item.tipo, 
      titulo: `OS: ${item.numeroOS}`,
      descricao: item.descricaoProblemaServico,
      responsavel: item.tecnicoResponsavel || 'N/A',
      status: item.status,
      isOS: true,
      anexos: item.anexos || [] // Captura os anexos da OS
    }));

    // Processa Ocorrências da Ficha Técnica
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

    // Filtros de Data
    if (dataInicio) {
        unificado = unificado.filter(item => new Date(item.data) >= new Date(dataInicio + 'T00:00:00'));
    }
    if (dataFim) {
        unificado = unificado.filter(item => new Date(item.data) <= new Date(dataFim + 'T23:59:59'));
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
        <h3 className="tab-inner-title">
          <FontAwesomeIcon icon={faHistory} /> AUDITORIA DO ATIVO
        </h3>
        
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
                        <div className="title-group">
                            <span className="card-date">{formatarDataHora(item.data)}</span>
                            <h4 className="card-title">{item.titulo}</h4>
                        </div>
                    </div>
                    <div className="card-header-right">
                        {/* Ícone de Clipe para sinalizar anexos na OS */}
                        {item.isOS && item.anexos?.length > 0 && (
                            <FontAwesomeIcon icon={faPaperclip} style={{ marginRight: '10px', color: '#64748b' }} title="Possui documentos anexados" />
                        )}
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

                                {/* LISTAGEM DE ANEXOS PARA DOWNLOAD (APENAS PARA MANUTENÇÕES) */}
                                {item.isOS && item.anexos?.length > 0 && (
                                    <div style={{marginTop: '15px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                                        <h5 style={{fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#475569', textTransform: 'uppercase'}}>Documentos Anexados:</h5>
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                            {item.anexos.map(file => (
                                                <a key={file.id} href={`${API_BASE_URL}/${file.path}`} target="_blank" rel="noopener noreferrer" style={{fontSize: '0.9rem', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500'}}>
                                                    <FontAwesomeIcon icon={faFileDownload} /> {file.nomeOriginal}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
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