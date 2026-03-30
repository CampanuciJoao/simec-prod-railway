// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO 10.0 - COM GESTÃO DE RESOLUÇÃO DE OCORRÊNCIAS

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getManutencoes, getOcorrenciasPorEquipamento, addOcorrencia, resolverOcorrencia } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faEye, faSpinner, faPlus, faSave, faTimes, 
  faFileMedical, faTools, faChevronDown, faChevronUp, faUser, faInfoCircle, faCheckCircle, faExclamationCircle 
} from '@fortawesome/free-solid-svg-icons';

function TabHistorico({ equipamentoId }) {
  const { addToast } = useToast();
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());

  // Estados para solução de ocorrência
  const [resolvendoId, setResolvendoId] = useState(null);
  const [dadosSolucao, setDadosSolucao] = useState({ solucao: '', tecnicoResolucao: '' });

  const [novaOcorrencia, setNovaOcorrencia] = useState({ titulo: '', descricao: '', tipo: 'Operacional', tecnico: '' });

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

  const linhaDoTempo = useMemo(() => {
    const m = historicoBruto.manutencoes.map(item => ({
      uniqueId: `os-${item.id}`,
      data: item.dataHoraAgendamentoInicio,
      tipoPrincipal: 'Manutenção',
      subtipo: item.tipo,
      titulo: `OS: ${item.numeroOS}`,
      descricao: item.descricaoProblemaServico,
      responsavel: item.tecnicoResponsavel,
      status: item.status,
      link: `/manutencoes/detalhes/${item.id}`,
      isOS: true,
      resolvido: item.status === 'Concluida'
    }));

    const o = historicoBruto.ocorrencias.map(item => ({
      uniqueId: `oc-${item.id}`,
      idReal: item.id,
      data: item.data,
      tipoPrincipal: 'Ocorrência',
      subtipo: item.tipo,
      titulo: item.titulo,
      descricao: item.descricao,
      responsavel: item.tecnico,
      status: item.resolvido ? 'Resolvido' : 'Pendente',
      resolvido: item.resolvido,
      solucao: item.solucao,
      dataResolucao: item.dataResolucao,
      tecnicoResolucao: item.tecnicoResolucao,
      link: null,
      isOS: false
    }));

    return [...m, ...o].sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [historicoBruto]);

  const handleSalvarSolucao = async (id) => {
    if (!dadosSolucao.solucao.trim()) return addToast('Descreva a solução aplicada.', 'error');
    setSubmitting(true);
    try {
      await resolverOcorrencia(id, dadosSolucao);
      addToast('Ocorrência resolvida!', 'success');
      setResolvendoId(null);
      setDadosSolucao({ solucao: '', tecnicoResolucao: '' });
      carregarTudo();
    } catch (err) {
      addToast('Erro ao salvar solução.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="historico-unificado">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <h3 className="tab-title"><FontAwesomeIcon icon={faHistory} /> Histórico Unificado</h3>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <FontAwesomeIcon icon={faPlus} /> Registrar Ocorrência
          </button>
        )}
      </div>

      {/* [O FORMULÁRIO DE NOVA OCORRÊNCIA CONTINUA O MESMO DA V9] */}
      {showForm && (
        <div className="form-ocorrencia-container" style={{marginBottom: '25px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
           <form onSubmit={async (e) => {
             e.preventDefault();
             setSubmitting(true);
             try {
               await addOcorrencia({ ...novaOcorrencia, equipamentoId });
               addToast('Registrado!', 'success');
               setShowForm(false);
               setNovaOcorrencia({ titulo: '', descricao: '', tipo: 'Operacional', tecnico: '' });
               carregarTudo();
             } catch { addToast('Erro!', 'error'); } finally { setSubmitting(false); }
           }} className="form-elegante">
             <div className="form-group"><label>Título *</label><input type="text" value={novaOcorrencia.titulo} onChange={e => setNovaOcorrencia({...novaOcorrencia, titulo: e.target.value})} required /></div>
             <div className="info-grid grid-cols-2">
               <div className="form-group"><label>Tipo</label><select value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia({...novaOcorrencia, tipo: e.target.value})}><option value="Operacional">Operacional</option><option value="Ajuste">Ajuste</option><option value="Infraestrutura">Infraestrutura</option></select></div>
               <div className="form-group"><label>Registrado por</label><input type="text" value={novaOcorrencia.tecnico} onChange={e => setNovaOcorrencia({...novaOcorrencia, tecnico: e.target.value})} /></div>
             </div>
             <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>Salvar Ocorrência</button>
             <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)} style={{marginLeft: '10px'}}>Cancelar</button>
           </form>
        </div>
      )}

      <div className="timeline-cards">
        {linhaDoTempo.map((item) => {
          const expandido = itensExpandidos.has(item.uniqueId);
          const isPendente = !item.isOS && !item.resolvido;

          return (
            <div key={item.uniqueId} className={`history-card ${item.isOS ? 'type-os' : 'type-oc'} ${isPendente ? 'border-pendente' : ''}`}>
              <div className="history-card-header" onClick={() => toggleExpandir(item.uniqueId)}>
                <div className="header-main">
                  <div className="header-icon">
                    <FontAwesomeIcon icon={item.isOS ? faTools : (item.resolvido ? faCheckCircle : faExclamationCircle)} />
                  </div>
                  <div className="header-info">
                    <span className="info-date">{formatarDataHora(item.data)}</span>
                    <h4 className="info-title">{item.titulo}</h4>
                  </div>
                </div>
                <div className="header-meta">
                  <span className={`status-badge-inline ${item.resolvido ? 'badge-resolvido' : 'badge-pendente'}`}>
                    {item.status}
                  </span>
                  <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} className="expand-icon" />
                </div>
              </div>

              {expandido && (
                <div className="history-card-body">
                  <div className="body-content">
                    <p><strong>Descrição:</strong> {item.descricao || 'Sem detalhes.'}</p>
                    <p><strong>Responsável pelo registro:</strong> {item.responsavel || 'N/A'}</p>
                    
                    {/* Seção de Solução para Ocorrências */}
                    {!item.isOS && (
                      <div className="solution-box" style={{marginTop: '15px', padding: '15px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px'}}>
                        {item.resolvido ? (
                          <>
                            <h5 style={{color: '#059669', marginBottom: '5px'}}><FontAwesomeIcon icon={faCheckCircle} /> Solução Aplicada:</h5>
                            <p style={{fontStyle: 'italic', marginBottom: '5px'}}>{item.solucao}</p>
                            <small>Resolvido por <strong>{item.tecnicoResolucao}</strong> em {formatarDataHora(item.dataResolucao)}</small>
                          </>
                        ) : (
                          resolvendoId === item.idReal ? (
                            <div className="form-resolucao">
                              <textarea 
                                placeholder="Descreva como o problema foi resolvido..." 
                                className="form-control" 
                                value={dadosSolucao.solucao}
                                onChange={e => setDadosSolucao({...dadosSolucao, solucao: e.target.value})}
                                style={{width: '100%', marginBottom: '10px'}}
                              />
                              <input 
                                type="text" 
                                placeholder="Nome do Técnico" 
                                className="form-control"
                                value={dadosSolucao.tecnicoResolucao}
                                onChange={e => setDadosSolucao({...dadosSolucao, tecnicoResolucao: e.target.value})}
                                style={{marginBottom: '10px'}}
                              />
                              <button className="btn btn-success btn-sm" onClick={() => handleSalvarSolucao(item.idReal)}>Confirmar Solução</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setResolvendoId(null)} style={{marginLeft: '5px'}}>Cancelar</button>
                            </div>
                          ) : (
                            <button className="btn btn-outline-success btn-sm" onClick={(e) => { e.stopPropagation(); setResolvendoId(item.idReal); }}>
                              <FontAwesomeIcon icon={faCheckCircle} /> Marcar como Resolvido
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TabHistorico;