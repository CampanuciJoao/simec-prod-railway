import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getManutencoes, getOcorrenciasPorEquipamento, addOcorrencia, resolverOcorrencia } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faEye, faSpinner, faPlus, faSave, faTimes, 
  faTools, faChevronDown, faChevronUp, faUser, faCheckCircle, faExclamationTriangle, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

// Estilos internos rápidos para garantir o layout básico caso o CSS demore a carregar
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }
};

function TabHistorico({ equipamentoId }) {
  const { addToast } = useToast();
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      tipo: 'Manutenção',
      categoria: item.tipo,
      titulo: `Ordem de Serviço: ${item.numeroOS}`,
      descricao: item.descricaoProblemaServico,
      responsavel: item.tecnicoResponsavel,
      status: item.status,
      link: `/manutencoes/detalhes/${item.id}`,
      isOS: true
    }));

    const o = historicoBruto.ocorrencias.map(item => ({
      uniqueId: `oc-${item.id}`,
      idReal: item.id,
      data: item.data,
      tipo: 'Ocorrência',
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
    <div className="unified-history-wrapper">
      <div className="tab-header-action">
        <h3 className="tab-inner-title"><FontAwesomeIcon icon={faHistory} /> Linha do Tempo do Ativo</h3>
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
           }}>
             <div className="form-group"><label>Título da Ocorrência *</label><input type="text" value={novaOcorrencia.titulo} onChange={e => setNovaOcorrencia({...novaOcorrencia, titulo: e.target.value})} required placeholder="Ex: Monitor piscando, Falha de boot..." /></div>
             <div className="info-grid grid-cols-2">
               <div className="form-group"><label>Tipo</label><select value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia({...novaOcorrencia, tipo: e.target.value})}><option value="Operacional">Operacional</option><option value="Ajuste">Ajuste / Configuração</option><option value="Infraestrutura">Infraestrutura</option></select></div>
               <div className="form-group"><label>Quem registrou</label><input type="text" value={novaOcorrencia.tecnico} onChange={e => setNovaOcorrencia({...novaOcorrencia, tecnico: e.target.value})} placeholder="Seu nome" /></div>
             </div>
             <div className="form-actions-left">
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>Salvar no Histórico</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
             </div>
           </form>
        </div>
      )}

      {loading ? (
        <div className="loader-container"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>
      ) : (
        <div style={styles.container}>
          {linhaDoTempo.map((item) => {
            const expandido = itensExpandidos.has(item.uniqueId);
            const isPendente = !item.isOS && !item.resolvido;

            return (
              <div key={item.uniqueId} className={`history-card-new ${item.isOS ? 'os-border' : (isPendente ? 'pendente-border' : 'resolvido-border')}`}>
                <div className="history-card-header-new" onClick={() => toggleExpandir(item.uniqueId)}>
                  <div className="card-header-left">
                    <div className={`icon-circle ${item.isOS ? 'os-icon' : (isPendente ? 'pendente-icon' : 'resolvido-icon')}`}>
                      <FontAwesomeIcon icon={item.isOS ? faTools : (item.resolvido ? faCheckCircle : faExclamationTriangle)} />
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
                      <p><strong><FontAwesomeIcon icon={faInfoCircle} /> Detalhes:</strong> {item.descricao || 'Sem descrição.'}</p>
                      <p><strong><FontAwesomeIcon icon={faUser} /> Responsável:</strong> {item.responsavel || 'N/A'}</p>
                    </div>

                    {item.isOS ? (
                      <div className="card-footer-new">
                        <Link to={item.link} className="btn-link-os">Abrir Ordem de Serviço Completa →</Link>
                      </div>
                    ) : (
                      <div className="solution-section-new">
                        {item.resolvido ? (
                          <div className="solution-box-active">
                            <h5>Solução Técnica Aplicada:</h5>
                            <p>{item.solucao}</p>
                            <small>Resolvido por <strong>{item.tecnicoResolucao}</strong> em {formatarDataHora(item.dataResolucao)}</small>
                          </div>
                        ) : (
                          <div className="pending-action-box">
                            {resolvendoId === item.idReal ? (
                              <div className="resolver-form">
                                <textarea placeholder="Como foi resolvido?" value={dadosSolucao.solucao} onChange={e => setDadosSolucao({...dadosSolucao, solucao: e.target.value})} />
                                <input type="text" placeholder="Seu nome" value={dadosSolucao.tecnicoResolucao} onChange={e => setDadosSolucao({...dadosSolucao, tecnicoResolucao: e.target.value})} />
                                <div className="resolver-buttons">
                                  <button className="btn btn-success btn-sm" onClick={() => handleSalvarSolucao(item.idReal)}>Confirmar</button>
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