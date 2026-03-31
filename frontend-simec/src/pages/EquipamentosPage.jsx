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
import { formatarData } from '../utils/timeUtils';

// Importação dos componentes das abas internas
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
        atualizarStatusLocalmente
    } = useEquipamentos();

    const { 
        isOpen: isDeleteModalOpen, 
        modalData: equipParaExcluir, 
        openModal: abrirModalExclusao, 
        closeModal: fecharModalExclusao 
    } = useModal();

    // Estados para controlar quais cards estão abertos e qual aba cada um exibe
    const [expandidos, setExpandidos] = useState({}); // { id: true/false }
    const [abasAtivas, setAbasAtivas] = useState({}); // { id: 'cadastro' }

    // Efeito para aplicar filtros vindos do Dashboard (ex: clicar no gráfico)
    useEffect(() => {
        if (location.state?.filtroStatusInicial) {
            setFiltros(prev => ({ ...prev, status: location.state.filtroStatusInicial }));
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, setFiltros, navigate, location.pathname]);

    // Função para abrir/fechar o card
    const toggleExpandir = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
        // Se estiver abrindo e não tiver aba ativa, define 'cadastro' como padrão
        if (!expandidos[id] && !abasAtivas[id]) {
            setAbasAtivas(prev => ({ ...prev, [id]: 'cadastro' }));
        }
    };

    // Função para trocar a aba de um card específico
    const trocarAba = (equipId, nomeAba) => {
        setAbasAtivas(prev => ({ ...prev, [equipId]: nomeAba }));
    };

    const getRowHighlightClass = (status) => {
        const s = status?.toLowerCase().replace(/\s+/g, '') || 'default';
        const classes = { 
            operante: 'status-row-operante', 
            inoperante: 'status-row-inoperante', 
            emmanutencao: 'status-row-emmanutencao', 
            usolimitado: 'status-row-usolimitado' 
        };
        return classes[s] || '';
    };

    const confirmarExclusao = () => {
        if (equipParaExcluir) {
            removerEquipamento(equipParaExcluir.id);
            fecharModalExclusao();
        }
    };

    const selectFiltersConfig = useMemo(() => {
        const tipos = [...new Set(equipamentos.map(e => e.tipo).filter(Boolean))].sort();
        return [
            { id: 'unidadeId', value: controles.filtros.unidadeId, onChange: (v) => controles.handleFilterChange('unidadeId', v), options: unidadesDisponiveis.map(u => ({ value: u.id, label: u.nomeSistema })), defaultLabel: 'Todas Unidades' },
            { id: 'tipo', value: controles.filtros.tipo, onChange: (v) => controles.handleFilterChange('tipo', v), options: tipos, defaultLabel: 'Todos Tipos' },
            { id: 'status', value: controles.filtros.status, onChange: (v) => controles.handleFilterChange('status', v), options: ["Operante", "Inoperante", "UsoLimitado", "EmManutencao"].map(s => ({ value: s, label: s.replace(/([A-Z])/g, ' $1').trim() })), defaultLabel: 'Todos Status' }
        ];
    }, [equipamentos, unidadesDisponiveis, controles]);

    if (loading && equipamentos.length === 0) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;

    return (
        <>
            <ModalConfirmacao 
                isOpen={isDeleteModalOpen} 
                onClose={fecharModalExclusao} 
                onConfirm={confirmarExclusao} 
                title="Confirmar Exclusão" 
                message={`Deseja excluir o equipamento "${equipParaExcluir?.modelo}" (Tag: ${equipParaExcluir?.tag})?`} 
                isDestructive={true} 
            />

            <div className="page-content-wrapper">
                <div className="page-title-card">
                    <h1 className="page-title-internal">Gerenciamento de Equipamentos</h1>
                    <button className="btn btn-primary" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> Novo Equipamento
                    </button>
                </div>

                <GlobalFilterBar 
                    searchTerm={controles.searchTerm} 
                    onSearchChange={controles.handleSearchChange} 
                    searchPlaceholder="Buscar por Modelo, Tag..."
                    selectFilters={selectFiltersConfig} 
                />

                <div className="lista-equipamentos-moderna" style={{ marginTop: '25px' }}>
                    {equipamentos.length > 0 ? (
                        equipamentos.map(equip => {
                            const isAberto = expandidos[equip.id];
                            const abaAtual = abasAtivas[equip.id] || 'cadastro';

                            return (
                                <div key={equip.id} className={`equip-card-expansivel ${getRowHighlightClass(equip.status)}`}>
                                    
                                    {/* CABEÇALHO DO CARD */}
                                    <div className="equip-header" onClick={() => toggleExpandir(equip.id)}>
                                        <FontAwesomeIcon 
                                            icon={isAberto ? faMinusCircle : faPlusCircle} 
                                            style={{ color: 'var(--cor-primaria-light)', fontSize: '1.3rem' }} 
                                        />
                                        
                                        <div className="equip-header-info">
                                            <div><span className="header-label">Modelo</span><span className="header-value">{equip.modelo}</span></div>
                                            <div><span className="header-label">Tag (Série)</span><span className="header-value">{equip.tag}</span></div>
                                            <div><span className="header-label">Tipo</span><span className="header-value">{equip.tipo}</span></div>
                                            <div><span className="header-label">Unidade</span><span className="header-value">{equip.unidade?.nomeSistema || 'N/A'}</span></div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <span className="header-label">Alterar Status</span>
                                                <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                            </div>
                                        </div>

                                        <div className="equip-header-badges">
                                            <button className="btn-action view" onClick={(e) => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }} title="Ficha Técnica">
                                                <FontAwesomeIcon icon={faFileMedical} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ÁREA EXPANSÍVEL (CONTEÚDO DAS ABAS) */}
                                    {isAberto && (
                                        <div className="equip-detalhes-container">
                                            <div className="equip-tabs-nav">
                                                <button className={`equip-tab-btn ${abaAtual === 'cadastro' ? 'active' : ''}`} onClick={() => trocarAba(equip.id, 'cadastro')}><FontAwesomeIcon icon={faInfoCircle} /> Dados</button>
                                                <button className={`equip-tab-btn ${abaAtual === 'acessorios' ? 'active' : ''}`} onClick={() => trocarAba(equip.id, 'acessorios')}><FontAwesomeIcon icon={faHdd} /> Acessórios</button>
                                                <button className={`equip-tab-btn ${abaAtual === 'anexos' ? 'active' : ''}`} onClick={() => trocarAba(equip.id, 'anexos')}><FontAwesomeIcon icon={faPaperclip} /> Anexos</button>
                                                <button className={`equip-tab-btn ${abaAtual === 'historico' ? 'active' : ''}`} onClick={() => trocarAba(equip.id, 'historico')}><FontAwesomeIcon icon={faHistory} /> Histórico</button>
                                            </div>

                                            <div className="equip-tab-content">
                                                {abaAtual === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                                {abaAtual === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                                {abaAtual === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos || []} onUpdate={() => {}} />}
                                                {abaAtual === 'historico' && <TabHistorico equipamento={equip} />}
                                                
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
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