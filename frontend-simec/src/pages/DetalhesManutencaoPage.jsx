// Ficheiro: src/pages/DetalhesManutencaoPage.jsx
// VERSÃO ATUALIZADA - CONFIRMAÇÃO COM REAGENDAMENTO E OBSERVACÃO OBRIGATÓRIA

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useManutencaoDetalhes } from '../hooks/useManutencaoDetalhes';
import { useModal } from '../hooks/useModal';
import ModalConfirmacao from '../components/ModalConfirmacao';
import ModalCancelamento from '../components/ModalCancelamento';
import DateInput from '../components/DateInput';
import TimeInput from '../components/TimeInput';
import { formatarDataHora } from '../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft, faSpinner, faExclamationTriangle, faPaperclip, faUpload, 
    faPlus, faTrashAlt, faFilePdf, faFileImage, faFileAlt, faHistory, 
    faSave, faBan, faCheckCircle, faTimesCircle, faPrint, faScroll, faClock
} from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL_DOWNLOAD = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getIconePorTipoArquivo = (mimeType = '') => { 
    if (mimeType.startsWith('image/')) return <FontAwesomeIcon icon={faFileImage} style={{ marginRight: '8px' }} />;
    if (mimeType === 'application/pdf') return <FontAwesomeIcon icon={faFilePdf} style={{ marginRight: '8px' }} />;
    return <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: '8px' }} />;
};

const getStatusBadgeClassManutencao = (status) => {
    const statusClass = status?.toLowerCase().replace(/ /g, '-') || 'default';
    if (status === 'AguardandoConfirmacao') return 'status-badge status-os-emandamento';
    return `status-badge status-os-${statusClass}`;
};

function DetalhesManutencaoPage() {
  const { manutencaoId } = useParams();
  const navigate = useNavigate();
  const anexoInputRef = useRef(null);

  const {
    manutencao, loading, error, submitting,
    salvarAtualizacoes, adicionarNota, fazerUploadAnexo,
    removerAnexo, concluirOS, refetch: refetchManutencao
  } = useManutencaoDetalhes(manutencaoId);

  // Estados do formulário de edição simples
  const [formData, setFormData] = useState({
    descricaoProblemaServico: '', tecnicoResponsavel: '', dataInicioReal: '',
    horaInicioReal: '', dataFimReal: '', horaFimReal: '',
  });
  const [novaNota, setNovaNota] = useState('');

  // ESTADOS PARA O FORMULÁRIO DE CONFIRMAÇÃO (NOVOS)
  const [confirmMode, setConfirmMode] = useState(null); // 'OK' ou 'ERRO'
  const [dataTerminoReal, setDataTerminoReal] = useState('');
  const [novaPrevisao, setNovaPrevisao] = useState('');
  const [observacaoDecisao, setObservacaoDecisao] = useState('');
  
  const { isOpen: isDeleteAnexoModalOpen, modalData: anexoParaDeletar, openModal: openDeleteAnexoModal, closeModal: closeDeleteAnexoModal } = useModal();
  const { isOpen: isCancelModalOpen, openModal: openCancelModal, closeModal: closeCancelModal } = useModal();

  useEffect(() => {
    if (manutencao) {
      const inicioReal = manutencao.dataInicioReal ? new Date(manutencao.dataInicioReal) : null;
      const fimReal = manutencao.dataFimReal ? new Date(manutencao.dataFimReal) : null;
      setFormData({
        descricaoProblemaServico: manutencao.descricaoProblemaServico || '',
        tecnicoResponsavel: manutencao.tecnicoResponsavel || '',
        dataInicioReal: inicioReal ? inicioReal.toISOString().split('T')[0] : '',
        horaInicioReal: inicioReal ? inicioReal.toTimeString().slice(0, 5) : '',
        dataFimReal: fimReal ? fimReal.toISOString().split('T')[0] : '',
        horaFimReal: fimReal ? fimReal.toTimeString().slice(0, 5) : '',
      });
    }
  }, [manutencao]);
  
  const handleFormChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  
  const handleAddNota = async () => {
    if (novaNota.trim()) { await adicionarNota(novaNota); setNovaNota(''); }
  };
  
  const handleAnexoUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const uploadData = new FormData();
    for (let i = 0; i < files.length; i++) uploadData.append('arquivosManutencao', files[i]);
    fazerUploadAnexo(uploadData);
    if (anexoInputRef.current) anexoInputRef.current.value = null;
  };

  const handleSalvarAlteracoes = async () => {
    const dataInicio = formData.dataInicioReal ? new Date(`${formData.dataInicioReal}T${formData.horaInicioReal || '00:00:00'}`) : null;
    const dataFim = formData.dataFimReal ? new Date(`${formData.dataFimReal}T${formData.horaFimReal || '00:00:00'}`) : null;
    const payload = {
      descricaoProblemaServico: formData.descricaoProblemaServico,
      tecnicoResponsavel: formData.tecnicoResponsavel,
      dataInicioReal: dataInicio ? dataInicio.toISOString() : null,
      dataFimReal: dataFim ? dataFim.toISOString() : null,
    };
    await salvarAtualizacoes(payload);
  };

  // FUNÇÃO PARA PROCESSAR A DECISÃO FINAL DA OS
  const handleConfirmacaoFinal = async () => {
    if (confirmMode === 'OK') {
        if (!dataTerminoReal) return alert("Informe a data e hora de término.");
        await concluirOS({ 
            equipamentoOperante: true, 
            dataTerminoReal: new Date(dataTerminoReal).toISOString() 
        });
    } else {
        if (!novaPrevisao || !observacaoDecisao.trim()) return alert("Observação e Nova Previsão são obrigatórias.");
        await concluirOS({ 
            equipamentoOperante: false, 
            novaPrevisao: new Date(novaPrevisao).toISOString(),
            observacao: observacaoDecisao 
        });
    }
    // Reseta o formulário após salvar
    setConfirmMode(null);
  };
  
  const handlePrint = () => { window.print(); };

  if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;
  if (error) return <div className="page-content-wrapper"><p className="form-error"><FontAwesomeIcon icon={faExclamationTriangle} /> {error.message}</p></div>;

  const camposPrincipaisBloqueados = manutencao.status === 'Cancelada' || manutencao.status === 'Concluida';
  const isCancelavel = manutencao.status === 'Agendada' || manutencao.status === 'EmAndamento';

  return (
    <>
      <ModalConfirmacao isOpen={isDeleteAnexoModalOpen} onClose={closeDeleteAnexoModal} onConfirm={async () => { await removerAnexo(anexoParaDeletar.id); closeDeleteAnexoModal(); }} title="Excluir Anexo" message={`Tem certeza que deseja excluir o anexo "${anexoParaDeletar?.nomeOriginal}"?`} isDestructive={true} />
      <ModalCancelamento isOpen={isCancelModalOpen} onClose={closeCancelModal} manutencao={manutencao} onCancelConfirm={refetchManutencao} />

      <div className="page-content-wrapper">
        <div className="page-title-card no-print">
            <h1 className="page-title-internal">OS: {manutencao.numeroOS}</h1>
            <div className="page-title-actions">
                <button className="btn btn-primary" onClick={handlePrint}><FontAwesomeIcon icon={faPrint}/> Imprimir</button>
                <button className="btn btn-secondary" onClick={() => navigate('/manutencoes')} style={{marginLeft: '10px'}}><FontAwesomeIcon icon={faArrowLeft}/> Voltar</button>
            </div>
        </div>
        
        {/* SEÇÃO DE CONFIRMAÇÃO OBRIGATÓRIA */}
        {manutencao.status === 'AguardandoConfirmacao' && ( 
            <section className="page-section no-print" style={{ borderColor: '#F59E0B', background: '#fefce8', borderWidth: '2px' }}> 
                <h3 style={{color: '#B45309'}}>Ação Necessária: Confirmar Finalização da Manutenção</h3> 
                <p>O tempo agendado terminou. Por favor, registre o resultado final para fechar este chamado:</p> 
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className={`btn ${confirmMode === 'OK' ? 'btn-success' : 'btn-secondary'}`} onClick={() => setConfirmMode('OK')}>
                            <FontAwesomeIcon icon={faCheckCircle} /> Equipamento Operante
                        </button>
                        <button className={`btn ${confirmMode === 'ERRO' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setConfirmMode('ERRO')}>
                            <FontAwesomeIcon icon={faTimesCircle} /> Continua Inoperante
                        </button>
                    </div>

                    {confirmMode === 'OK' && (
                        <div className="form-group" style={{ maxWidth: '400px' }}>
                            <label>Data e Hora real do término do serviço: *</label>
                            <input type="datetime-local" className="form-control" onChange={(e) => setDataTerminoReal(e.target.value)} />
                        </div>
                    )}

                    {confirmMode === 'ERRO' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
                            <div className="form-group">
                                <label>Por que não ficou pronto? (Auditoria) *</label>
                                <textarea rows="2" className="form-control" placeholder="Descreva o motivo (ex: aguardando peça)..." onChange={(e) => setObservacaoDecisao(e.target.value)}></textarea>
                            </div>
                            <div className="form-group">
                                <label>Nova previsão de término: *</label>
                                <input type="datetime-local" className="form-control" onChange={(e) => setNovaPrevisao(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {confirmMode && (
                        <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={handleConfirmacaoFinal} disabled={submitting}>
                            {submitting ? 'Processando...' : 'Confirmar e Atualizar Sistema'}
                        </button>
                    )}
                </div>
            </section> 
        )}
        
        <section className="page-section">
          <h3>Informações Gerais</h3>
          <div className="info-grid">
              <p><strong>Equipamento:</strong> <Link to={`/equipamentos/detalhes/${manutencao.equipamento?.id}`}>{manutencao.equipamento?.modelo}</Link></p>
              <p><strong>Tipo:</strong> {manutencao.tipo}</p>
              <p><strong>Status OS:</strong> <span className={getStatusBadgeClassManutencao(manutencao.status)}>{manutencao.status}</span></p>
              <p><strong>Previsão Agendada:</strong> {formatarDataHora(manutencao.dataHoraAgendamentoInicio)}</p>
          </div>
          <div className="form-group" style={{ marginTop: '20px' }}><label>Descrição do Problema / Serviço:</label><textarea name="descricaoProblemaServico" value={formData.descricaoProblemaServico} onChange={handleFormChange} rows="3" disabled={camposPrincipaisBloqueados}></textarea></div>
          
          <div className="info-grid" style={{ marginTop: '15px', alignItems: 'flex-end' }}>
              <div className="form-group"><label>Técnico Responsável</label><input type="text" name="tecnicoResponsavel" value={formData.tecnicoResponsavel} onChange={handleFormChange} disabled={camposPrincipaisBloqueados} /></div>
              <div style={{display: 'flex', gap: '15px'}}><div className="form-group" style={{flex: 1}}><label>Início Real</label><DateInput name="dataInicioReal" value={formData.dataInicioReal} onChange={handleFormChange} disabled={true} /></div><div className="form-group" style={{flex: 1}}><label>Hora Início</label><TimeInput name="horaInicioReal" value={formData.horaInicioReal} onChange={handleFormChange} disabled={true} /></div></div>
              <div style={{display: 'flex', gap: '15px'}}><div className="form-group" style={{flex: 1}}><label>Fim Real</label><DateInput name="dataFimReal" value={formData.dataFimReal} onChange={handleFormChange} disabled={camposPrincipaisBloqueados} /></div><div className="form-group" style={{flex: 1}}><label>Hora Fim</label><TimeInput name="horaFimReal" value={formData.horaFimReal} onChange={handleFormChange} disabled={camposPrincipaisBloqueados} /></div></div>
          </div>

          <div className="form-actions no-print" style={{ justifyContent: 'flex-start', marginTop: '20px', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleSalvarAlteracoes} disabled={submitting || camposPrincipaisBloqueados}><FontAwesomeIcon icon={faSave} /> Salvar Alterações</button>
            {isCancelavel && <button className="btn btn-danger" onClick={() => openCancelModal(manutencao)} disabled={submitting}><FontAwesomeIcon icon={faBan} /> Cancelar</button>}
          </div>
        </section>

        <section className="page-section">
          <div className="section-header">
              <h3><FontAwesomeIcon icon={faHistory} /> Histórico do Chamado</h3>
              <Link to="/gerenciamento/auditoria" state={{ filtroEntidade: 'Manutenção', filtroEntidadeId: manutencao.id }} className="btn btn-secondary btn-sm no-print">
                  <FontAwesomeIcon icon={faScroll} /> Auditoria Completa
              </Link>
          </div>
          {(manutencao.notasAndamento?.length > 0) ? ( <ul className="list-group" style={{marginBottom: '20px'}}>{manutencao.notasAndamento.map((nota) => ( <li key={nota.id} className="list-group-item" style={{display: 'block'}}><strong style={{color: '#1e293b'}}>{formatarDataHora(nota.data)} - {nota.autor?.nome || 'Sistema'}:</strong><span style={{marginLeft: '8px'}}>{nota.nota}</span></li> ))}</ul> ) : <p className="no-data-message" style={{marginBottom: '20px'}}>Nenhuma nota registrada.</p> } 
          
          <div className="form-group no-print"><label htmlFor="nova-nota">Adicionar Nota Manual</label><textarea id="nova-nota" rows="2" value={novaNota} onChange={(e) => setNovaNota(e.target.value)} disabled={submitting}></textarea></div>
          <button className="btn btn-primary btn-sm no-print" onClick={handleAddNota} disabled={submitting || !novaNota.trim()} style={{marginTop: '10px'}}><FontAwesomeIcon icon={faPlus} /> Adicionar Nota</button>
        </section>
        
        <section className="page-section no-print">
          <div className="section-header">
            <h3><FontAwesomeIcon icon={faPaperclip} /> Anexos ({manutencao.anexos?.length || 0})</h3>
            <button onClick={() => anexoInputRef.current.click()} className="btn btn-sm btn-success" disabled={submitting}><FontAwesomeIcon icon={faUpload} /> Enviar Arquivo</button>
          </div>
          <input type="file" multiple ref={anexoInputRef} onChange={handleAnexoUpload} style={{ display: 'none' }} disabled={submitting} />
          {(manutencao.anexos?.length > 0) ? ( <ul className="list-group" style={{marginTop: '15px'}}>{manutencao.anexos.map(anexo => ( <li key={anexo.id} className="list-group-item"><a href={`${API_BASE_URL_DOWNLOAD}/${anexo.path}`} target="_blank" rel="noopener noreferrer">{getIconePorTipoArquivo(anexo.tipoMime)} {anexo.nomeOriginal}</a><button onClick={() => openDeleteAnexoModal(anexo)} className="btn-action delete"><FontAwesomeIcon icon={faTrashAlt} /></button></li> ))}</ul> ) : <p className="no-data-message">Nenhum anexo.</p> }
        </section>
      </div>
    </>
  );
}

export default DetalhesManutencaoPage;