// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 11.0 - MODERNIZADA COM TAILWIND CSS, CARDS EXPANSÍVEIS E SKELETONS

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
    faTrashAlt,
    faCubes // Ícone para o título
} from '@fortawesome/free-solid-svg-icons';

import { useEquipamentos } from '../hooks/useEquipamentos';
import { useModal } from '../hooks/useModal';
import { useAuth } from '../contexts/AuthContext';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';
import StatusSelector from '../components/StatusSelector';
import SkeletonCard from '../components/SkeletonCard'; // <<< IMPORTADO

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
        setFiltros,
        controles,
        removerEquipamento,
        atualizarStatusLocalmente,
        refetch 
    } = useEquipamentos();

    const { 
        isOpen: isDeleteModalOpen, 
        modalData: equipParaExcluir, 
        openModal: abrirModalExclusao, 
        closeModal: fecharModalExclusao 
    } = useModal();

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

    // Lógica de cores Tailwind baseada no status (Design System)
    const getStatusStyles = (status) => {
        const s = status?.toLowerCase() || '';
        const map = {
            operante: 'border-green-500 bg-green-50/30',
            inoperante: 'border-red-500 bg-red-50/30',
            emmanutencao: 'border-yellow-500 bg-yellow-50/30',
            usolimitado: 'border-blue-500 bg-blue-50/30'
        };
        return map[s] || 'border-slate-300 bg-slate-50';
    };

    const selectFiltersConfig = useMemo(() => {
        const tipos = [...new Set(equipamentos.map(e => e.tipo).filter(Boolean))].sort();
        return [
            { id: 'unidadeId', value: controles.filtros.unidadeId, onChange: (v) => controles.handleFilterChange('unidadeId', v), options: unidadesDisponiveis.map(u => ({ value: u.id, label: u.nomeSistema })), defaultLabel: 'Todas Unidades' },
            { id: 'tipo', value: controles.filtros.tipo, onChange: (v) => controles.handleFilterChange('tipo', v), options: tipos.map(t => ({ value: t, label: t })), defaultLabel: 'Todos Tipos' },
            { id: 'status', value: controles.filtros.status, onChange: (v) => controles.handleFilterChange('status', v), options: ["Operante", "Inoperante", "UsoLimitado", "EmManutencao"].map(s => ({ value: s, label: s.replace(/([A-Z])/g, ' $1').trim() })), defaultLabel: 'Todos Status' }
        ];
    }, [equipamentos, unidadesDisponiveis, controles]);

    // ==========================================================================
    // >> NOVO: ESTADO DE CARREGAMENTO COM SKELETONS (VISUAL MODERNO) <<
    // ==========================================================================
    if (loading && equipamentos.length === 0) {
        return (
            <div className="page-content-wrapper">
                <div className="page-title-card bg-slate-800 border-none shadow-lg">
                    <h1 className="page-title-internal">Gerenciamento de Ativos</h1>
                </div>
                <div className="space-y-4 mt-8 px-4">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }

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

            <div className="page-content-wrapper pb-20">
                {/* TÍTULO DA PÁGINA COM TAILWIND */}
                <div className="page-title-card shadow-xl bg-slate-800 border-none mb-8">
                    <h1 className="page-title-internal flex items-center gap-3">
                        <FontAwesomeIcon icon={faCubes} className="text-blue-400" />
                        Parque Tecnológico
                    </h1>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> Novo Ativo
                    </button>
                </div>

                {/* BARRA DE FILTROS DENTRO DE UM CARD LIMPO */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 mx-1">
                    <GlobalFilterBar 
                        searchTerm={controles.searchTerm} 
                        onSearchChange={controles.handleSearchChange} 
                        searchPlaceholder="Pesquisar modelo, patrimônio ou série..."
                        selectFilters={selectFiltersConfig} 
                    />
                </div>

                {/* LISTAGEM DE CARDS EXPANSÍVEIS */}
                <div className="flex flex-col gap-4">
                    {equipamentos.length > 0 ? (
                        equipamentos.map(equip => {
                            const isAberto = expandidos[equip.id];
                            const abaAtual = abasAtivas[equip.id] || 'cadastro';
                            const statusStyle = getStatusStyles(equip.status);

                            return (
                                <div key={equip.id} className={`bg-white rounded-2xl border-l-[12px] ${statusStyle} shadow-sm hover:shadow-md transition-all overflow-hidden`}>
                                    
                                    {/* CABEÇALHO DO CARD (DINÂMICO) */}
                                    <div className={`p-5 flex items-center justify-between cursor-pointer ${isAberto ? 'bg-slate-50/50' : ''}`} onClick={() => toggleExpandir(equip.id)}>
                                        
                                        <div className="flex items-center gap-6 flex-1">
                                            <FontAwesomeIcon 
                                                icon={isAberto ? faMinusCircle : faPlusCircle} 
                                                className={`${isAberto ? 'text-slate-400' : 'text-blue-500'} text-xl`} 
                                            />
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-2 flex-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modelo</span>
                                                    <span className="font-bold text-slate-800 truncate">{equip.modelo}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Série / Tag</span>
                                                    <span className="font-mono font-medium text-slate-600 italic">{equip.tag}</span>
                                                </div>
                                                <div className="hidden md:flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tipo</span>
                                                    <span className="text-slate-600 truncate">{equip.tipo}</span>
                                                </div>
                                                <div className="hidden lg:flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Unidade</span>
                                                    <span className="text-slate-600 truncate font-semibold">{equip.unidade?.nomeSistema || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Status Atual</span>
                                                    <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 ml-4">
                                            <button className="bg-white hover:bg-blue-50 text-blue-600 w-10 h-10 rounded-full border border-blue-100 shadow-sm transition-all flex items-center justify-center" onClick={(e) => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }} title="Abrir Ficha Técnica">
                                                <FontAwesomeIcon icon={faFileMedical} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* CONTEÚDO EXPANSÍVEL COM SISTEMA DE ABAS PROFISSIONAL */}
                                    {isAberto && (
                                        <div className="border-t border-slate-100 bg-white">
                                            <div className="flex bg-slate-50 px-5 pt-3 gap-2 border-b border-slate-200">
                                                <button className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-t-xl transition-all ${abaAtual === 'cadastro' ? 'bg-white text-blue-600 border-x border-t border-slate-200 mb-[-1px]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, 'cadastro')}><FontAwesomeIcon icon={faInfoCircle} className="mr-2"/>Dados</button>
                                                <button className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-t-xl transition-all ${abaAtual === 'acessorios' ? 'bg-white text-blue-600 border-x border-t border-slate-200 mb-[-1px]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, 'acessorios')}><FontAwesomeIcon icon={faHdd} className="mr-2"/>Acessórios</button>
                                                <button className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-t-xl transition-all ${abaAtual === 'anexos' ? 'bg-white text-blue-600 border-x border-t border-slate-200 mb-[-1px]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, 'anexos')}><FontAwesomeIcon icon={faPaperclip} className="mr-2"/>Anexos</button>
                                                <button className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-t-xl transition-all ${abaAtual === 'historico' ? 'bg-white text-blue-600 border-x border-t border-slate-200 mb-[-1px]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, 'historico')}><FontAwesomeIcon icon={faHistory} className="mr-2"/>Histórico</button>
                                            </div>

                                            <div className="p-8 min-h-[300px] animate-fadeIn">
                                                {abaAtual === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                                {abaAtual === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                                {abaAtual === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos || []} onUpdate={refetch} />}
                                                {abaAtual === 'historico' && <TabHistorico equipamento={equip} />}
                                                
                                                <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
                                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors" onClick={() => navigate(`/cadastros/equipamentos/editar/${equip.id}`)}>
                                                        <FontAwesomeIcon icon={faEdit} /> Editar Equipamento
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-xs transition-colors" onClick={() => abrirModalExclusao(equip)}>
                                                            <FontAwesomeIcon icon={faTrashAlt} /> Excluir Registro
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
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-slate-300 text-4xl mb-4" />
                            <p className="text-slate-400 font-medium text-lg">Nenhum equipamento encontrado para os filtros aplicados.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default EquipamentosPage;