import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEquipamentoById, getOcorrenciasPorEquipamento, addOcorrencia, resolverOcorrencia } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatarDataHora } from '../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, faSave, faSpinner, faFileMedical, faHistory, faUser, 
  faChevronDown, faChevronUp, faCheckCircle, faExclamationTriangle, faInfoCircle 
} from '@fortawesome/free-solid-svg-icons';

function FichaTecnicaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [equipamento, setEquipamento] = useState(null);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  const [resolvendoId, setResolvendoId] = useState(null);
  const [dadosSolucao, setDadosSolucao] = useState({ solucao: '', tecnicoResolucao: '' });

  const [novaOcorrencia, setNovaOcorrencia] = useState({
    titulo: '', descricao: '', tipo: 'Operacional', tecnico: ''
  });

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [equip, lista] = await Promise.all([
        getEquipamentoById(id),
        getOcorrenciasPorEquipamento(id)
      ]);
      setEquipamento(equip);
      setOcorrencias(lista);
    } catch (err) {
      addToast('Erro ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const toggleExpandir = (id) => {
    const novosExpandidos = new Set(itensExpandidos);
    novosExpandidos.has(id) ? novosExpandidos.delete(id) : novosExpandidos.add(id);
    setItensExpandidos(novosExpandidos);
  };

  const handleSalvarSolucao = async (idOcorr) => {
    if (!dadosSolucao.solucao.trim()) return addToast('Descreva a solução.', 'error');
    setSubmitting(true);
    try {
      await resolverOcorrencia(idOcorr, dadosSolucao);
      addToast('Ocorrência resolvida!', 'success');
      setResolvendoId(null);
      setDadosSolucao({ solucao: '', tecnicoResolucao: '' });
      carregarDados();
    } catch { addToast('Erro ao salvar.', 'error'); } finally { setSubmitting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addOcorrencia({ ...novaOcorrencia, equipamentoId: id });
      addToast('Registro adicionado!', 'success');
      setNovaOcorrencia({ titulo: '', descricao: '', tipo: 'Operacional', tecnico: '' });
      carregarDados();
    } catch (err) {
      addToast('Erro ao salvar.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>;

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          <FontAwesomeIcon icon={faFileMedical} /> Ficha Técnica: {equipamento?.modelo}
        </h1>
        <button className="btn btn-secondary" onClick={() => navigate('/equipamentos')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>

      <div className="page-layout-split">
        <div className="layout-split-form-column">
          <section className="page-section">
            <h3 className="section-title">Registrar Ocorrência</h3>
            <form onSubmit={handleSubmit} className="form-elegante">
              <div className="form-group">
                <label>Título do Evento *</label>
                <input type="text" value={novaOcorrencia.titulo} onChange={e => setNovaOcorrencia({...novaOcorrencia, titulo: e.target.value})} required />
              </div>
              <div className="info-grid grid-cols-2">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia({...novaOcorrencia, tipo: e.target.value})}>
                    <option value="Operacional">Operacional</option>
                    <option value="Ajuste">Ajuste / Configuração</option>
                    <option value="Infraestrutura">Infraestrutura</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Responsável</label>
                  <input type="text" value={novaOcorrencia.tecnico} onChange={e => setNovaOcorrencia({...novaOcorrencia, tecnico: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea rows="3" value={novaOcorrencia.descricao} onChange={e => setNovaOcorrencia({...novaOcorrencia, descricao: e.target.value})}></textarea>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Salvar no Histórico</button>
            </form>
          </section>
        </div>

        <div className="layout-split-table-column">
          <section className="page-section">
            <h3 className="section-title"><FontAwesomeIcon icon={faHistory} /> Histórico de Vida</h3>
            <div className="timeline-cards-list" style={{ marginTop: '20px' }}>
              {ocorrencias.map(item => {
                const expandido = itensExpandidos.has(item.id);
                return (
                  <div key={item.id} className={`history-card-item ${item.resolvido ? 'resolvido-card' : 'pendente-card'}`}>
                    <div className="history-card-header" onClick={() => toggleExpandir(item.id)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className={`icon-indicator ${item.resolvido ? 'resolvido-bg' : 'pendente-bg'}`}>
                          <FontAwesomeIcon icon={item.resolvido ? faCheckCircle : faExclamationTriangle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b' }}>{formatarDataHora(item.data)}</span>
                          <h4 style={{ margin: 0, fontSize: '1rem' }}>{item.titulo}</h4>
                        </div>
                      </div>
                      <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} />
                    </div>

                    {expandido && (
                      <div className="history-card-body" style={{ padding: '15px 15px 15px 70px', borderTop: '1px solid #f1f5f9' }}>
                        <p style={{ fontSize: '0.9rem' }}><strong>Descrição:</strong> {item.descricao || 'Sem detalhes.'}</p>
                        <p style={{ fontSize: '0.9rem' }}><strong>Registrado por:</strong> {item.tecnico || 'N/A'}</p>
                        
                        <div className="solution-area" style={{ marginTop: '15px' }}>
                          {item.resolvido ? (
                            <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                              <h5 style={{ color: '#166534', margin: '0 0 5px 0' }}>Solução Técnica:</h5>
                              <p style={{ color: '#15803d', fontSize: '0.9rem', margin: 0 }}>{item.solucao}</p>
                              <small>Resolvido por <strong>{item.tecnicoResolucao}</strong></small>
                            </div>
                          ) : (
                            resolvendoId === item.id ? (
                              <div className="solution-mini-form">
                                <textarea placeholder="Como foi resolvido?" value={dadosSolucao.solucao} onChange={e => setDadosSolucao({...dadosSolucao, solucao: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                <input type="text" placeholder="Técnico" value={dadosSolucao.tecnicoResolucao} onChange={e => setDadosSolucao({...dadosSolucao, tecnicoResolucao: e.target.value})} style={{ width: '100%', marginTop: '10px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                <button className="btn btn-success btn-sm" style={{ marginTop: '10px' }} onClick={() => handleSalvarSolucao(item.id)}>Confirmar</button>
                                <button className="btn btn-secondary btn-sm" style={{ marginTop: '10px', marginLeft: '5px' }} onClick={() => setResolvendoId(null)}>Cancelar</button>
                              </div>
                            ) : (
                              <button className="btn btn-outline-success btn-sm" onClick={(e) => { e.stopPropagation(); setResolvendoId(item.id); }}>
                                <FontAwesomeIcon icon={faCheckCircle} /> Resolver Problema
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default FichaTecnicaPage;