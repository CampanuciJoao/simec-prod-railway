import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeguros } from '../hooks/useSeguros';
import { useModal } from '../hooks/useModal';
import { useToast } from '../contexts/ToastContext';
import { formatarData } from '../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faTrashAlt, 
    faSpinner, 
    faExclamationTriangle, 
    faEdit, 
    faPlusCircle, 
    faMinusCircle, 
    faPaperclip,
    faShieldAlt,
    faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';

// --- Funções Auxiliares de Estilo e Status ---

const getDynamicStatus = (seguro) => {
    if (seguro.status === 'Cancelado') return 'Cancelado';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dataFim = new Date(seguro.dataFim);
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

const getRowHighlightClass = (seguro) => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dataFim = new Date(seguro.dataFim);
    if (seguro.status === 'Cancelado') return 'status-row-cancelado';
    if (dataFim < hoje) return 'status-row-vencendo-danger';
    const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return 'status-row-vencendo-warning';
    return 'status-row-ativo';
};

// Função para formatar dinheiro (R$)
const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
};

function SegurosPage() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [expandidos, setExpandidos] = useState({});

    const {
        seguros,
        segurosOriginais,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        filtros,
        setFiltros,
        removerSeguro
    } = useSeguros();
    
    const { isOpen: isDeleteModalOpen, modalData: seguroParaDeletar, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();

    const toggleExpandir = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const confirmarExclusao = async () => {
        if (!seguroParaDeletar) return;
        try {
            await removerSeguro(seguroParaDeletar.id);
            addToast('Seguro excluído com sucesso!', 'success');
        } catch (err) {
            addToast('Erro ao excluir seguro.', 'error');
        } finally {
            closeDeleteModal();
        }
    };
    
    const seguradorasUnicas = useMemo(() => [...new Set((segurosOriginais || []).map(s => s.seguradora).filter(Boolean))].sort(), [segurosOriginais]);
    const statusDbOptions = ["Ativo", "Expirado", "Cancelado"];
    
    const selectFiltersConfig = [
        { id: 'seguradora', value: filtros.seguradora, onChange: (v) => setFiltros(f => ({ ...f, seguradora: v })), options: seguradorasUnicas, defaultLabel: 'Todas Seguradoras' },
        { id: 'status', value: filtros.status, onChange: (v) => setFiltros(f => ({ ...f, status: v })), options: statusDbOptions, defaultLabel: 'Todos Status' },
    ];

    if (loading && seguros.length === 0) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;

    return (
        <>
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={closeDeleteModal} onConfirm={confirmarExclusao} title="Confirmar Exclusão" message={`Deseja excluir a apólice nº ${seguroParaDeletar?.apoliceNumero}?`} isDestructive={true} />
            
            <div className="page-content-wrapper">
                <div className="page-title-card">
                    <h1 className="page-title-internal">Gestão de Seguros e Coberturas</h1>
                    <button className="btn btn-primary" onClick={() => navigate('/seguros/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> Novo Seguro
                    </button>
                </div>

                <section className="page-section" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                    <GlobalFilterBar 
                        searchTerm={searchTerm} 
                        onSearchChange={(e) => setSearchTerm(e.target.value)} 
                        searchPlaceholder="Buscar apólice ou seguradora..." 
                        selectFilters={selectFiltersConfig} 
                    />

                    {error && <p className="form-error"><FontAwesomeIcon icon={faExclamationTriangle} /> {error.message}</p>}

                    <div className="lista-seguros-moderna" style={{ marginTop: '20px' }}>
                        {seguros.length > 0 ? (
                            seguros.map(seguro => {
                                const isAberto = expandidos[seguro.id];
                                const statusDinamico = getDynamicStatus(seguro);
                                
                                return (
                                    <div key={seguro.id} className={`seguro-card-expansivel ${getRowHighlightClass(seguro)}`}>
                                        
                                        {/* CABEÇALHO DO CARD (Sempre visível) */}
                                        <div className="seguro-header" onClick={() => toggleExpandir(seguro.id)}>
                                            <FontAwesomeIcon 
                                                icon={isAberto ? faMinusCircle : faPlusCircle} 
                                                style={{ color: 'var(--cor-primaria-light)', fontSize: '1.3rem' }} 
                                            />
                                            
                                            <div className="header-info-principal">
                                                <div>
                                                    <span className="header-label">Nº Apólice</span>
                                                    <span className="header-value">{seguro.apoliceNumero}</span>
                                                </div>
                                                <div>
                                                    <span className="header-label">Seguradora</span>
                                                    <span className="header-value">{seguro.seguradora}</span>
                                                </div>
                                                <div>
                                                    <span className="header-label">Objeto Segurado</span>
                                                    <span className="header-value">
                                                        {seguro.equipamento?.modelo || seguro.unidade?.nomeSistema || 'Geral (Todos)'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="header-label">Vencimento</span>
                                                    <span className="header-value">{formatarData(seguro.dataFim)}</span>
                                                </div>
                                            </div>

                                            <div className="header-status-icons" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span className={getStatusBadgeClass(statusDinamico)}>{statusDinamico}</span>
                                                <FontAwesomeIcon 
                                                    icon={faPaperclip} 
                                                    style={{ 
                                                        color: seguro.anexos?.length > 0 ? '#22C55E' : '#CBD5E1',
                                                        fontSize: '1.1rem'
                                                    }} 
                                                    title={seguro.anexos?.length > 0 ? "Apólice anexada" : "Sem anexo"}
                                                />
                                            </div>
                                        </div>

                                        {/* DETALHES EXPANDIDOS (Aparecem ao clicar) */}
                                        {isAberto && (
                                            <div className="seguro-detalhes-expandidos">
                                                <div className="lmi-item">
                                                    <span className="lmi-label">Incêndio / Explosão</span>
                                                    <div className="lmi-valor">{formatarMoeda(seguro.lmiIncendio)}</div>
                                                </div>
                                                <div className="lmi-item">
                                                    <span className="lmi-label">Danos Elétricos</span>
                                                    <div className="lmi-valor">{formatarMoeda(seguro.lmiDanosEletricos)}</div>
                                                </div>
                                                <div className="lmi-item">
                                                    <span className="lmi-label">Roubo / Furto</span>
                                                    <div className="lmi-valor">{formatarMoeda(seguro.lmiRoubo)}</div>
                                                </div>
                                                <div className="lmi-item">
                                                    <span className="lmi-label">Quebra de Vidros</span>
                                                    <div className="lmi-valor">{formatarMoeda(seguro.lmiVidros)}</div>
                                                </div>
                                                <div className="lmi-item">
                                                    <span className="lmi-label">Resp. Civil (Terceiros)</span>
                                                    <div className="lmi-valor">{formatarMoeda(seguro.lmiResponsabilidadeCivil)}</div>
                                                </div>
                                                <div className="lmi-item" style={{ background: '#eef2ff', borderLeftColor: '#4f46e5' }}>
                                                    <span className="lmi-label" style={{ color: '#4338ca' }}>Prêmio Total (Custo)</span>
                                                    <div className="lmi-valor" style={{ color: '#4338ca' }}>{formatarMoeda(seguro.premioTotal)}</div>
                                                </div>

                                                <div className="card-actions-expandido" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                                    <button className="btn-action edit" onClick={(e) => { e.stopPropagation(); navigate(`/seguros/editar/${seguro.id}`); }}>
                                                        <FontAwesomeIcon icon={faEdit} /> Editar Apólice
                                                    </button>
                                                    <button className="btn-action delete" onClick={(e) => { e.stopPropagation(); openDeleteModal(seguro); }}>
                                                        <FontAwesomeIcon icon={faTrashAlt} /> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-data-message">Nenhum seguro encontrado para os filtros aplicados.</div>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}

export default SegurosPage;