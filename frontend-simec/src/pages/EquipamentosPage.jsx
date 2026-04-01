// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 12.0 - ALTO CONTRASTE, CORES SÓLIDAS POR STATUS E UI IMPACTANTE

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
    faCubes
} from '@fortawesome/free-solid-svg-icons';

import { useEquipamentos } from '../hooks/useEquipamentos';
import { useModal } from '../hooks/useModal';
import { useAuth } from '../contexts/AuthContext';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';
import StatusSelector from '../components/StatusSelector';
import SkeletonCard from '../components/SkeletonCard';

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

    // >> LÓGICA DE CORES DE ALTO IMPACTO <<
    const getStatusStyles = (status) => {
        const s = status?.toLowerCase() || '';
        // Retorna: Cor do Fundo | Cor do Texto | Cor da Borda
        if (s === 'operante') return 'bg-emerald-600 text-white border-emerald-700';
        if (s === 'inoperante') return 'bg-red-600 text-white border-red-700';
        if (s === 'emmanutencao') return 'bg-amber-400 text-slate-900 border-amber-500';
        if (s === 'usolimitado') return 'bg-blue-600 text-white border-blue-700';
        return 'bg-slate-200 text-slate-800 border-slate-300';
    };

    const selectFiltersConfig = useMemo(() => {
        const tipos = [...new Set(equipamentos.map(e => e.tipo).filter(Boolean))].sort();
        return [
            { id: 'unidadeId', value: controles.filtros.unidadeId, onChange: (v) => controles.handleFilterChange('unidadeId', v), options: unidadesDisponiveis.map(u => ({ value: u.id, label: u.nomeSistema })), defaultLabel: 'Todas Unidades' },
            { id: 'tipo', value: controles.filtros.tipo, onChange: (v) => controles.handleFilterChange('tipo', v), options: tipos.map(t => ({ value: t, label: t })), defaultLabel: 'Todos Tipos' },
            { id: 'status', value: controles.filtros.status, onChange: (v) => controles.handleFilterChange('status', v), options: ["Operante", "Inoperante", "UsoLimitado", "EmManutencao"].map(s => ({ value: s, label: s.replace(/([A-Z])/g, ' $1').trim() })), defaultLabel: 'Todos Status' }
        ];
    }, [equipamentos, unidadesDisponiveis, controles]);

    if (loading && equipamentos.length === 0) {
        return (
            <div className="page-content-wrapper">
                <div className="page-title-card bg-slate-800 border-none shadow-lg"><h1 className="page-title-internal">Gerenciamento de Ativos</h1></div>
                <div className="space-y-4 mt-8 px-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
            </div>
        );
    }

    return (
        <>
            <ModalConfirmacao 
                isOpen={isDeleteModalOpen} 
                onClose={fecharModalExclusao} 
                onConfirm={() => { removerEquipamento(equipParaExcluir.id); fecharModalExclusao(); }} 
                title="Excluir Equipamento" 
                message={`Deseja excluir permanentemente o equipamento "${equipParaExcluir?.modelo}"?`} 
                isDestructive={true} 
            />

            <div className="page-content-wrapper pb-20">
                <div className="page-title-card shadow-xl bg-slate-800 border-none mb-8">
                    <h1 className="page-title-internal flex items-center gap-3">
                        <FontAwesomeIcon icon={faCubes} className="text-blue-400" />
                        Parque Tecnológico
                    </h1>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> Novo Ativo
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 mx-1">
                    <GlobalFilterBar 
                        searchTerm={controles.searchTerm} 
                        onSearchChange={controles.handleSearchChange} 
                        searchPlaceholder="Pesquisar modelo, patrimônio ou série..."
                        selectFilters={selectFiltersConfig} 
                    />
                </div>

                <div className="flex flex-col gap-4">
                    {equipamentos.length > 0 ? (
                        equipamentos.map(equip => {
                            const isAberto = expandidos[equip.id];
                            const abaAtual = abasAtivas[equip.id] || 'cadastro';
                            const colorStyle = getStatusStyles(equip.status);
                            const isLightBg = equip.status?.toLowerCase() === 'emmanutencao';

                            return (
                                <div key={equip.id} className={`rounded-2xl shadow-lg transition-all overflow-hidden mb-2 border-b-4 ${colorStyle}`}>
                                    
                                    {/* CABEÇALHO DO CARD (COR SÓLIDA) */}
                                    <div className={`p-5 flex items-center justify-between cursor-pointer ${isAberto ? 'brightness-95' : ''}`} onClick={() => toggleExpandir(equip.id)}>
                                        
                                        <div className="flex items-center gap-6 flex-1">
                                            <FontAwesomeIcon 
                                                icon={isAberto ? faMinusCircle : faPlusCircle} 
                                                className={`text-2xl ${isLightBg ? 'text-black/30' : 'text-white/40'}`} 
                                            />
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-2 flex-1">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter opacity-70`}>Modelo</span>
                                                    <span className="font-black text-lg leading-tight uppercase truncate">{equip.modelo}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter opacity-70`}>Série / Tag</span>
                                                    <span className="font-mono font-bold">{equip.tag}</span>
                                                </div>
                                                <div className="hidden md:flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter opacity-70`}>Tipo</span>
                                                    <span className="font-bold truncate">{equip.tipo}</span>
                                                </div>
                                                <div className="hidden lg:flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter opacity-70`}>Unidade</span>
                                                    <span className="font-bold truncate">{equip.unidade?.nomeSistema || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter opacity-70 mb-1`}>Status Atual</span>
                                                    <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 ml-4">
                                            <button className={`w-12 h-12 rounded-full transition-all flex items-center justify-center border-none shadow-inner ${isLightBg ? 'bg-black/10 text-slate-900 hover:bg-black/20' : 'bg-white/20 text-white hover:bg-white/30'}`} onClick={(e) => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }} title="Abrir Ficha Técnica">
                                                <FontAwesomeIcon icon={faFileMedical} size="lg" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* CONTEÚDO EXPANSÍVEL (MANTIDO EM FUNDO NEUTRO PARA LEITURA) */}
                                    {isAberto && (
                                        <div className="bg-white text-slate-800">
                                            <div className="flex bg-slate-100 px-5 pt-3 gap-2 border-b border-slate-200">
                                                <button className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-t-xl transition-all ${abaAtual === 'cadastro' ? 'bg-white text-blue-600 mb-[-1px]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, 'cadastro')}>Dados</button>
                                                <button className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-t-xl transition-all ${abaAtual === 'acessorios' ? 'bg-white text-blue-600 mb-[-1px]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, 'acessorios')}>Acessórios</button>
                                                <button className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-t-xl transition-all ${abaAtual === 'anexos' ? 'bg-white text-blue-600 mb-[-1px]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, 'anexos')}>Anexos</button>
                                                <button className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-t-xl transition-all ${abaAtual === 'historico' ? 'bg-white text-blue-600 mb-[-1px]' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, 'historico')}>Histórico</button>
                                            </div>

                                            <div className="p-8 min-h-[300px] animate-fadeIn">
                                                {abaAtual === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                                {abaAtual === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                                {abaAtual === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos || []} onUpdate={refetch} />}
                                                {abaAtual === 'historico' && <TabHistorico equipamento={equip} />}
                                                
                                                <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
                                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors border-none cursor-pointer" onClick={() => navigate(`/cadastros/equipamentos/editar/${equip.id}`)}>
                                                        <FontAwesomeIcon icon={faEdit} /> Editar Equipamento
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-xs transition-colors border-none cursor-pointer" onClick={() => abrirModalExclusao(equip)}>
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
                            <p className="text-slate-400 font-medium text-lg">Nenhum equipamento encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default EquipamentosPage;