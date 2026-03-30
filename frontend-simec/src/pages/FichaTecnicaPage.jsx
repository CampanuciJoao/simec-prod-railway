import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEquipamentoById, getOcorrenciasPorEquipamento, addOcorrencia } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatarDataHora } from '../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave, faSpinner, faFileMedical, faHistory, faUser } from '@fortawesome/free-solid-svg-icons';

function FichaTecnicaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [equipamento, setEquipamento] = useState(null);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estado do formulário de nova ocorrência
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
      addToast('Erro ao carregar dados da ficha técnica.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addOcorrencia({ ...novaOcorrencia, equipamentoId: id });
      addToast('Registro adicionado com sucesso!', 'success');
      setNovaOcorrencia({ titulo: '', descricao: '', tipo: 'Operacional', tecnico: '' });
      carregarDados(); // Recarrega a lista
    } catch (err) {
      addToast('Erro ao salvar registro.', 'error');
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
        {/* Lado Esquerdo: Formulário de Registro */}
        <div className="layout-split-form-column">
          <section className="page-section">
            <h3 className="section-title">Registrar Evento / Ocorrência</h3>
            <form onSubmit={handleSubmit} className="form-elegante">
              <div className="form-group">
                <label>Título do Evento *</label>
                <input type="text" value={novaOcorrencia.titulo} onChange={e => setNovaOcorrencia({...novaOcorrencia, titulo: e.target.value})} placeholder="Ex: Queda de energia, Troca de usuário..." required />
              </div>
              <div className="info-grid grid-cols-2">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia({...novaOcorrencia, tipo: e.target.value})}>
                    <option value="Operacional">Operacional</option>
                    <option value="Ajuste">Ajuste / Configuração</option>
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Software">Software</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Responsável</label>
                  <input type="text" value={novaOcorrencia.tecnico} onChange={e => setNovaOcorrencia({...novaOcorrencia, tecnico: e.target.value})} placeholder="Seu nome" />
                </div>
              </div>
              <div className="form-group">
                <label>Descrição Detalhada</label>
                <textarea rows="3" value={novaOcorrencia.descricao} onChange={e => setNovaOcorrencia({...novaOcorrencia, descricao: e.target.value})}></textarea>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <FontAwesomeIcon icon={submitting ? faSpinner : faSave} spin={submitting} /> Salvar no Histórico
              </button>
            </form>
          </section>
        </div>

        {/* Lado Direito: Timeline de Eventos */}
        <div className="layout-split-table-column">
          <section className="page-section">
            <h3 className="section-title"><FontAwesomeIcon icon={faHistory} /> Histórico de Vida do Equipamento</h3>
            <div className="timeline-container">
              {ocorrencias.length === 0 ? (
                <p className="no-data-message">Nenhum evento registrado ainda.</p>
              ) : (
                ocorrencias.map(item => (
                  <div key={item.id} className="timeline-item">
                    <div className="timeline-date">{formatarDataHora(item.data)}</div>
                    <div className="timeline-badge">{item.tipo}</div>
                    <div className="timeline-content">
                      <h4>{item.titulo}</h4>
                      <p>{item.descricao}</p>
                      <small><FontAwesomeIcon icon={faUser} /> {item.tecnico || 'Não informado'}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default FichaTecnicaPage;