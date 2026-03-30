// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO 11.0 - INTERFACE PROFISSIONAL COM CARDS E ACORDEÃO

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getManutencoes, getOcorrenciasPorEquipamento, addOcorrencia, resolverOcorrencia } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faEye, faSpinner, faPlus, faSave, faTimes, 
  faTools, faChevronDown, faChevronUp, faUser, faCheckCircle, faExclamationTriangle, faInfoCircle, faWrench
} from '@fortawesome/free-solid-svg-icons';

function TabHistorico({ equipamentoId }) {
  const { addToast } = useToast();
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Estado para controlar quais cards estão abertos
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
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
      categoria: item.tipo,
      titulo: `Ordem de Serviço: ${item.numeroOS}`,
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
      categoria: item.tipo,
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
    if (!dadosSolucao.solucao.trim()) return addToast('Descreva a solução.', 'error');
    setSubmitting(true);
    try {
      await resolverOcorrencia(id, dadosSolucao);
      addToast('Ocorrência resolvida!', 'success');
      setResolvendoId(null);
      setDadosSolucao({ solucao: '', tecnicoResolucao: '' });
      carregarTudo();
    } catch { addToast('Erro ao salvar.', 'error'); } finally { setSubmitting(false); }
  };

  return (
    <div className="unified-history-container">
      <div className="tab-header-action">
        <h3 className="tab-inner-title"><FontAwesomeIcon icon={faHistory} /> Histórico de Vida do Equipamento</h3>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <FontAwesomeIcon icon={faPlus} /> Registrar Ocorrência
          </button>
        )}
      </div>

      {showForm && (
        <div className="quick-form-card">
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
             <div className="form-group"><label>Título do Evento *</label><input type="text" value={novaOcorrencia.titulo} onChange={e => setNovaOcorrencia({...novaOcorrencia, titulo: e.target.value})} required placeholder="Ex: Queda de energia, Falha de boot..." /></div>
             <div className="info-grid grid-cols-2">
               <div className="form-group"><label>Categoria</label><select value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia({...novaOcorrencia, tipo: e.target.value})}><option value="Operacional">Operacional</option><option value="Ajuste">Ajuste / Configuração</option><option value="Infraestrutura">Infraestrutura</option></select></div>
               <div className="form-group"><label>Responsável</label><input type="text" value={novaOcorrencia.tecnico} onChange={e => setNovaOcorrencia({...novaOcorrencia, tecnico: e.target.value})} placeholder="Seu nome" /></div>
             </div>
             <div className="form-actions" style={{justifyContent: 'flex-start', border: 'none', paddingTop: 0}}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>Salvar no Histórico</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)} style={{marginLeft: '10px'}}>Cancelar</button>
             </div>
           </form>
        </div>
      )}

      {loading ? (
        <div className="loader-container" style={{textAlign: 'center', padding: '40px'}}><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>
      ) : (
        <div className="timeline-cards-list">
          {linhaDoTempo.map((item) => {
            const expandido = itensExpandidos.has(item.uniqueId);
            const isPendente = !item.isOS && !item.resolvido;

            return (
              <div key={item.uniqueId} className={`history-card-item ${item.isOS ? 'os-card' : (isPendente ? 'pendente-card' : 'resolvido-card')}`}>
                <div className="history-card-header" onClick={() => toggleExpandir(item.uniqueId)}>
                  <div className="header-left-content">
                    <div className={`icon-indicator ${item.isOS ? 'os-bg' : (isPendente ? 'pendente-bg' : 'resolvido-bg')}`}>
                      <FontAwesomeIcon icon={item.isOS ? faWrench : (item.resolvido ? faCheckCircle : faExclamationTriangle)} />
                    </div>
                    <div className="header-text-group">
                      <span className="event-date">{formatarDataHora(item.data)}</span>
                      <h4 className="event-title">{item.titulo}</h4>
                    </div>
                  </div>
                  <div className="header-right-content">
                    <span className="type-tag">{item.categoria}</span>
                    <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} className="expand-arrow" />
                  </div>
                </div>

                {expandido && (
                  <div className="history-card-body">
                    <div className="detail-row">
                      <p><strong><FontAwesomeIcon icon={faInfoCircle} /> Descrição:</strong> {item.descricao || 'Sem detalhes informados.'}</p>
                      <p><strong><FontAwesomeIcon icon={faUser} /> Registrado por:</strong> {item.responsavel || 'N/A'}</p>
                    </div>

                    {item.isOS ? (
                      <div className="os-footer">
                        <Link to={item.link} className="btn-os-link">Visualizar Ordem de Serviço Detalhada →</Link>
                      </div>
                    ) : (
                      <div className="solution-area">
                        {item.resolvido ? (
                          <div className="solution-feedback success">
                            <h5>Solução Técnica:</h5>
                            <p>{item.solucao}</p>
                            <small>Resolvido por <strong>{item.tecnicoResolucao}</strong> em {formatarDataHora(item.dataResolucao)}</small>
                          </div>
                        ) : (
                          <div className="pending-solution-box">
                            {resolvendoId === item.idReal ? (
                              <div className="solution-mini-form">
                                <textarea placeholder="Como o problema foi resolvido?" value={dadosSolucao.solucao} onChange={e => setDadosSolucao({...dadosSolucao, solucao: e.target.value})} />
                                <input type="text" placeholder="Nome do Técnico" value={dadosSolucao.tecnicoResolucao} onChange={e => setDadosSolucao({...dadosSolucao, tecnicoResolucao: e.target.value})} />
                                <div className="mini-form-actions">
                                  <button className="btn btn-success btn-sm" onClick={() => handleSalvarSolucao(item.idReal)}>Confirmar Resolução</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setResolvendoId(null)}>Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <button className="btn btn-outline-success btn-sm" onClick={(e) => { e.stopPropagation(); setResolvendoId(item.idReal); }}>
                                <FontAwesomeIcon icon={faCheckCircle} /> Marcar como Resolvido
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TabHistorico;