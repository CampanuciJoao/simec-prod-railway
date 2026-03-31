import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContratos } from '../hooks/useContratos';
import { useModal } from '../hooks/useModal';
import { useToast } from '../contexts/ToastContext';
import { formatarData } from '../utils/timeUtils';
import { uploadAnexoContrato, deleteAnexoContrato } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faEdit, 
    faTrashAlt, 
    faSpinner, 
    faExclamationTriangle, 
    faPlusCircle, 
    faMinusCircle,
    faHospital,
    faMicrochip,
    faPaperclip,
    faUpload,
    faFilePdf,
    faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';

// Configuração da URL para buscar os arquivos no servidor
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// --- Funções Auxiliares de Estilo e Status ---

const getDynamicStatus = (contrato) => {
  if (contrato.status !== 'Ativo') return contrato.status;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dataFim = new Date(contrato.dataFim);
  if (dataFim < hoje) return 'Expirado';
  const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'Vence em breve';
  return 'Ativo';
};

const getStatusBadgeClass = (statusText) => {
  const statusMap = {
    'ativo': 'status-ativo',
    'expirado': 'status-inativo',
    'cancelado': 'status-cancelado',
    'vence em breve': 'status-vence-em-breve'
  };
  return `status-badge ${statusMap[statusText?.toLowerCase()] || 'default'}`;
};

const getRowHighlightClass = (contrato) => {
    if (contrato.status !== 'Ativo') return 'status-row-inativo';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0); 
    const dataFim = new Date(contrato.dataFim);
    const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return 'status-row-vencendo-danger';
    if (diffDays <= 30) return 'status-row-vencendo-warning';
    return 'status-row-ativo';
};

function ContratosPage() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [expandidos, setExpandidos] = useState({});
    const [uploadingId, setUploadingId] = useState(null);

    const {
        contratos,
        contratosOriginais,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        filtros,
        setFiltros,
        removerContrato,
        refetch // Função para atualizar a lista após upload/delete
    } = useContratos();

    const { isOpen: isDeleteModalOpen, modalData: contratoParaDeletar, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();

    const toggleExpandir = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const confirmarExclusao = async () => {
        if (!contratoParaDeletar) return;
        try {
            await removerContrato(contratoParaDeletar.id);
            addToast('Contrato excluído com sucesso!', 'success');
        } catch(err) {
            addToast('Erro ao excluir contrato.', 'error');
        } finally {
            closeDeleteModal();
        }
    };

    // Função para realizar o upload do arquivo
    const handleUploadArquivo = async (contratoId, event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('contratos', file);

        setUploadingId(contratoId);
        try {
            await uploadAnexoContrato(contratoId, formData);
            addToast('Documento anexado com sucesso!', 'success');
            refetch(); // Atualiza a lista para mostrar o ícone verde
        } catch (err) {
            addToast('Erro ao anexar arquivo.', 'error');
        } finally {
            setUploadingId(null);
        }
    };

    // Função para excluir um anexo
    const handleDeleteAnexo = async (contratoId, anexoId) => {
        if (!window.confirm("Tem certeza que deseja remover este documento?")) return;
        try {
            await deleteAnexoContrato(contratoId, anexoId);
            addToast('Documento removido.', 'success');
            refetch();
        } catch (err) {
            addToast('Erro ao remover documento.', 'error');
        }
    };
    
    const categoriasUnicas = useMemo(() => [...new Set((contratosOriginais || []).map(c => c.categoria).filter(Boolean))].sort(), [contratosOriginais]);
    const statusDbOptions = ["Ativo", "Expirado", "Cancelado"];

    const selectFiltersConfig = [
        { id: 'categoria', value: filtros.categoria, onChange: (v) => setFiltros(f => ({ ...f, categoria: v })), options: categoriasUnicas, defaultLabel: 'Todas Categorias' },
        { id: 'status', value: filtros.status, onChange: (v) => setFiltros(f => ({ ...f, status: v })), options: statusDbOptions, defaultLabel: 'Todos Status' },
    ];

    if (loading && contratos.length === 0) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;

    return (
        <>
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={closeDeleteModal} onConfirm={confirmarExclusao} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o contrato nº ${contratoParaDeletar?.numeroContrato}?`} isDestructive={true} />
            
            <div className="page-content-wrapper">
                <div className="page-title-card">
                    <h1 className="page-title-internal">Gestão de Contratos de Manutenção</h1>
                    <button className="btn btn-primary" onClick={() => navigate('/contratos/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> Novo Contrato
                    </button>
                </div>

                <section className="page-section" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                    <GlobalFilterBar 
                        searchTerm={searchTerm} 
                        onSearchChange={(e) => setSearchTerm(e.target.value)} 
                        searchPlaceholder="Buscar por número, fornecedor..." 
                        selectFilters={selectFiltersConfig} 
                    />

                    {error && <p className="form-error"><FontAwesomeIcon icon={faExclamationTriangle} /> {error.message}</p>}

                    <div className="lista-contratos-moderna" style={{ marginTop: '20px' }}>
                        {contratos.length > 0 ? (
                            contratos.map(contrato => {
                                const isAberto = expandidos[contrato.id];
                                const statusDinamico = getDynamicStatus(contrato);

                                return (
                                    <div key={contrato.id} className={`contrato-card-expansivel ${getRowHighlightClass(contrato)}`}>
                                        
                                        {/* CABEÇALHO DO CARD */}
                                        <div className="contrato-header" onClick={() => toggleExpandir(contrato.id)}>
                                            <FontAwesomeIcon 
                                                icon={isAberto ? faMinusCircle : faPlusCircle} 
                                                style={{ color: 'var(--cor-primaria-light)', fontSize: '1.3rem' }} 
                                            />
                                            
                                            <div className="contrato-header-info">
                                                <div>
                                                    <span className="header-label">Nº Contrato</span>
                                                    <div className="header-value">{contrato.numeroContrato}</div>
                                                </div>
                                                <div>
                                                    <span className="header-label">Fornecedor</span>
                                                    <div className="header-value">{contrato.fornecedor}</div>
                                                </div>
                                                <div>
                                                    <span className="header-label">Categoria</span>
                                                    <div className="header-value">{contrato.categoria}</div>
                                                </div>
                                                <div>
                                                    <span className="header-label">Vencimento</span>
                                                    <div className="header-value">{formatarData(contrato.dataFim)}</div>
                                                </div>
                                            </div>

                                            <div className="header-status-badge" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span className={getStatusBadgeClass(statusDinamico)}>{statusDinamico}</span>
                                                <FontAwesomeIcon 
                                                    icon={faPaperclip} 
                                                    style={{ 
                                                        color: contrato.anexos?.length > 0 ? '#22C55E' : '#CBD5E1',
                                                        fontSize: '1.1rem'
                                                    }} 
                                                    title={contrato.anexos?.length > 0 ? "Documento anexado" : "Sem anexo"}
                                                />
                                            </div>
                                        </div>

                                        {/* DETALHES EXPANDIDOS */}
                                        {isAberto && (
                                            <div className="contrato-detalhes-expandidos">
                                                <div className="detalhes-grid-contrato">
                                                    
                                                    {/* Lista de Unidades */}
                                                    <div className="lista-cobertura">
                                                        <h5><FontAwesomeIcon icon={faHospital} /> Unidades Cobertas</h5>
                                                        <div className="chips-container">
                                                            {contrato.unidadesCobertas?.map(u => (
                                                                <span key={u.id} className="chip-item">{u.nomeSistema}</span>
                                                            )) || 'Nenhuma unidade vinculada.'}
                                                        </div>
                                                    </div>

                                                    {/* Lista de Equipamentos */}
                                                    <div className="lista-cobertura">
                                                        <h5><FontAwesomeIcon icon={faMicrochip} /> Equipamentos Vinculados ({contrato.equipamentosCobertos?.length || 0})</h5>
                                                        <div className="equipamentos-lista-scroll" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                            {contrato.equipamentosCobertos?.length > 0 ? (
                                                                contrato.equipamentosCobertos.map(eq => (
                                                                    <div key={eq.id} className="equip-item-contrato">
                                                                        <span>{eq.modelo}</span>
                                                                        <span className="equip-tag-contrato">{eq.tag}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Sem equipamentos específicos.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SEÇÃO DE DOCUMENTOS DO CONTRATO */}
                                                <div className="anexos-seguro-container" style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <h5 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                                                        <FontAwesomeIcon icon={faPaperclip} /> DOCUMENTO DIGITAL DO CONTRATO
                                                    </h5>
                                                    
                                                    {contrato.anexos?.length > 0 ? (
                                                        <div className="lista-anexos-preview" style={{ marginBottom: '15px' }}>
                                                            {contrato.anexos.map(anexo => (
                                                                <div key={anexo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 15px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e2e8f0 shadow-sm' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                        <FontAwesomeIcon icon={faFilePdf} style={{ color: '#ef4444', fontSize: '1.2rem' }} />
                                                                        <a href={`${API_BASE_URL}/${anexo.path}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: '600', textDecoration: 'none' }}>
                                                                            {anexo.nomeOriginal} <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" style={{ marginLeft: '5px', opacity: 0.5 }} />
                                                                        </a>
                                                                    </div>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAnexo(contrato.id, anexo.id); }} className="btn-action delete" title="Remover Documento">
                                                                        <FontAwesomeIcon icon={faTrashAlt} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '15px' }}>Nenhum documento anexado.</p>
                                                    )}

                                                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                                        <FontAwesomeIcon icon={uploadingId === contrato.id ? faSpinner : faUpload} spin={uploadingId === contrato.id} />
                                                        {uploadingId === contrato.id ? 'Subindo...' : 'Anexar PDF do Contrato'}
                                                        <input 
                                                            type="file" 
                                                            style={{ display: 'none' }} 
                                                            onChange={(e) => handleUploadArquivo(contrato.id, e)} 
                                                            accept=".pdf,image/*" 
                                                            disabled={uploadingId !== null}
                                                        />
                                                    </label>
                                                </div>

                                                <div className="card-actions-expandido" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/contratos/editar/${contrato.id}`); }}>
                                                        <FontAwesomeIcon icon={faEdit} /> Editar Contrato
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); openDeleteModal(contrato); }}>
                                                        <FontAwesomeIcon icon={faTrashAlt} /> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-data-message">Nenhum contrato encontrado.</div>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}

export default ContratosPage;