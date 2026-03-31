import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faPlusCircle, 
    faMinusCircle, 
    faInfoCircle, 
    faHdd, 
    faPaperclip, 
    faHistory, 
    faSpinner, 
    faExclamationTriangle, 
    faFileMedical, 
    faEdit, 
    faTrashAlt
} from '@fortawesome/free-solid-svg-icons';

import { useEquipamentos } from '../hooks/useEquipamentos';
import { useModal } from '../hooks/useModal';
import { useAuth } from '../contexts/AuthContext';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';
import StatusSelector from '../components/StatusSelector';

// Componentes das abas internas
import TabCadastro from '../components/abas-equipamento/TabCadastro';
import TabAcessorios from '../components/abas-equipamento/TabAcessorios';
import TabAnexos from '../components/abas-equipamento/TabAnexos';
import TabHistorico from '../components/abas-equipamento/TabHistorico';

function EquipamentosPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const {
        equipamentos,
        unidadesDisponiveis,
        loading,
        error,
        setFiltros,
        controles,
        removerEquipamento,
        atualizarStatusLocalmente,
        refetch // Função para recarregar os dados
    } = useEquipamentos();

    const { 
        isOpen: isDeleteModalOpen, 
        modalData: equipParaExcluir, 
        openModal: abrirModalExclusao, 
        closeModal: fecharModalExclusao 
    } = useModal();

    // Estados para expansão e controle de qual aba está aberta em cada card
    const [expandidos, setExpandidos] = useState({});
    const [abasAtivas, setAbasAtivas] = useState({});

    useEffect(() => {
        if (location.state?.filtroStatusInicial) {
            setFiltros(prev => ({ ...prev, status: location.state.filtroStatusInicial }));
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, setFiltros, navigate, location.pathname]);

    const toggleExpandir = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
        if (!expandidos[id] && !abasAtivas[id]) {
            setAbasAtivas(prev => ({ ...prev, [id]: 'cadastro' }));
        }
    };

    const trocarAba = (equipId, nomeAba) => {
        setAbasAtivas(prev => ({ ...prev, [equipId]: nomeAba }));
    };

    const getStatusClass = (status) => {
        const s = status?.toLowerCase().replace(/\s+/g, '') || 'default';
        const map = { 
            operante: 'status-row-operante', 
            inoperante: 'status-row-inoperante', 
            emmanutencao: 'status-row-emmanutencao', 
            usolimitado: 'status-row-usolimitado' 
        };
        return map[s] || '';
    };

    const selectFiltersConfig = useMemo(() => {
        const tipos = [...new Set(equipamentos.map(e => e.tipo).filter(Boolean))].sort();
        return [
            { id: 'unidadeId', value: controles.filtros.unidadeId, onChange: (v) => controles.handleFilterChange('unidadeId', v), options: unidadesDisponiveis.map(u => ({ value: u.id, label: u.nomeSistema })), defaultLabel: 'Todas Unidades' },
            { id: 'tipo', value: controles.filtros.tipo, onChange: (v) => controles.handleFilterChange('tipo', v), options: tipos.map(t => ({ value: t, label: t })), defaultLabel: 'Todos Tipos' },
            { id: 'status', value: controles.filtros.status, onChange: (v) => controles.handleFilterChange('status', v), options: ["Operante", "Inoperante", "UsoLimitado", "EmManutencao"].map(s => ({ value: s, label: s.replace(/([A-Z])/g, ' $1').trim() })), defaultLabel: 'Todos Status' }
        ];
    }, [equipamentos, unidadesDisponiveis, controles]);

    if (loading && equipamentos.length === 0) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;

    return (
        <>
            <ModalConfirmacao 
                isOpen={isDeleteModalOpen} 
                onClose={fecharModalExclusao} 
                onConfirm={() => { removerEquipamento(equipParaExcluir.id); fecharModalExclusao(); }} 
                title="Confirmar Exclusão" 
                message={`Deseja excluir permanentemente o equipamento "${equipParaExcluir?.modelo}"?`} 
                isDestructive={true} 
            />

            <div className="page-content-wrapper">
                <div className="page-title-card">
                    <h1 className="page-title-internal">Gerenciamento Equipamentos</h1>
                    <button className="btn btn-primary" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> Adicionar Equipamento
                    </button>
                </div>

                <GlobalFilterBar 
                    searchTerm={controles.searchTerm} 
                    onSearchChange={controles.handleSearchChange} 
                    searchPlaceholder="Buscar por modelo ou tag..."
                    selectFilters={selectFiltersConfig} 
                />

                <div className="lista-equipamentos-moderna" style={{ marginTop: '25px' }}>
                    {equipamentos.length > 0 ? (
                        equipamentos.map(equip => {
                            const isAberto = expandidos[equip.id];
                            const abaAtual = abasAtivas[equip.id] || 'cadastro';

                            return (
                                <div key={equip.id} className={`equip-card-expansivel ${getStatusClass(equip.status)}`}>
                                    
                                    {/* CABEÇALHO DO CARD (COLORIDO POR STATUS) */}
                                    <div className="equip-header" onClick={() => toggleExpandir(equip.id)}>
                                        <FontAwesomeIcon 
                                            icon={isAberto ? faMinusCircle : faPlusCircle} 
                                            style={{ color: 'var(--cor-primaria-light)', fontSize: '1.4rem' }} 
                                        />
                                        
                                        <div className="equip-header-info">
                                            <div><span className="header-label">Modelo</span><div className="header-value">{equip.modelo}</div></div>
                                            <div><span className="header-label">Nº Série (Tag)</span><div className="header-value">{equip.tag}</div></div>
                                            <div><span className="header-label">Tipo</span><div className="header-value">{equip.tipo}</div></div>
                                            <div><span className="header-label">Unidade</span><div className="header-value">{equip.unidade?.nomeSistema || 'N/A'}</div></div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <span className="header-label">Status Atual</span>
                                                <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                            </div>
                                        </div>

                                        <button className="btn-action view" onClick={(e) => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }} title="Ficha Técnica Rápida">
                                            <FontAwesomeIcon icon={faFileMedical} />
                                        </button>
                                    </div>

                                    {/* ÁREA EXPANSÍVEL (ABAS MODERNAS) */}
                                    {isAberto && (
                                        <div className="equip-detalhes-container">
                                            <div className="equip-tabs-nav">
                                                <button className={`equip-tab-btn ${abaAtual === 'cadastro' ? 'active' : ''}`} onClick={() => trocarAba(equip.id, 'cadastro')}><FontAwesomeIcon icon={faInfoCircle} /> Dados Técnicos</button>
                                                <button className={`equip-tab-btn ${abaAtual === 'acessorios' ? 'active' : ''}`} onClick={() => trocarAba(equip.id, 'acessorios')}><FontAwesomeIcon icon={faHdd} /> Acessórios</button>
                                                <button className={`equip-tab-btn ${abaAtual === 'anexos' ? 'active' : ''}`} onClick={() => trocarAba(equip.id, 'anexos')}><FontAwesomeIcon icon={faPaperclip} /> Anexos</button>
                                                <button className={`equip-tab-btn ${abaAtual === 'historico' ? 'active' : ''}`} onClick={() => trocarAba(equip.id, 'historico')}><FontAwesomeIcon icon={faHistory} /> Histórico/Vida</button>
                                            </div>

                                            <div className="equip-tab-content">
                                                {abaAtual === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                                {abaAtual === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                                {abaAtual === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos || []} onUpdate={refetch} />}
                                                {abaAtual === 'historico' && <TabHistorico equipamento={equip} />}
                                                
                                                {/* Botões de Ação no final da expansão */}
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/cadastros/equipamentos/editar/${equip.id}`)}>
                                                        <FontAwesomeIcon icon={faEdit} /> Editar Equipamento
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => abrirModalExclusao(equip)}>
                                                            <FontAwesomeIcon icon={faTrashAlt} /> Excluir
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-data-message">Nenhum equipamento encontrado.</div>
                    )}
                </div>
            </div>
        </>
    );
}

export default EquipamentosPage;