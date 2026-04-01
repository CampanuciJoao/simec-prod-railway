// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 13.0 - DESIGN CLEAN (INSPIRADO NA REFERÊNCIA)

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

    const { isOpen: isDeleteModalOpen, modalData: equipParaExcluir, openModal: abrirModalExclusao, closeModal: fecharModalExclusao } = useModal();

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

    // --- LÓGICA DE CORES CLEAN (Barra lateral + Fundo sutil) ---
    const getStatusStyles = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'operante') return 'border-emerald-500 bg-emerald-50/40';
        if (s === 'inoperante') return 'border-red-500 bg-red-50/40';
        if (s === 'emmanutencao') return 'border-amber-500 bg-amber-50/40';
        if (s === 'usolimitado') return 'border-blue-500 bg-blue-50/40';
        return 'border-slate-300 bg-slate-50';
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
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={fecharModalExclusao} onConfirm={() => { removerEquipamento(equipParaExcluir.id); fecharModalExclusao(); }} title="Excluir Equipamento" message={`Deseja excluir permanentemente o equipamento "${equipParaExcluir?.modelo}"?`} isDestructive={true} />

            <div className="page-content-wrapper pb-20">
                {/* Cabeçalho de Página Clean */}
                <div className="page-title-card shadow-md bg-[#1e293b] border-none mb-6">
                    <h1 className="page-title-internal flex items-center gap-3 text-white">
                        <FontAwesomeIcon icon={faHdd} className="text-blue-400" />
                        Parque Tecnológico
                    </h1>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-bold shadow transition-all flex items-center gap-2 border-none cursor-pointer" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> Novo Ativo
                    </button>
                </div>

                {/* Filtros em Container Branco */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 mx-1">
                    <GlobalFilterBar 
                        searchTerm={controles.searchTerm} 
                        onSearchChange={controles.handleSearchChange} 
                        searchPlaceholder="Pesquisar por modelo, série ou hospital..."
                        selectFilters={selectFiltersConfig} 
                    />
                </div>

                {/* Lista de Cards Estilo Referência */}
                <div className="flex flex-col gap-3">
                    {equipamentos.length > 0 ? (
                        equipamentos.map(equip => {
                            const isAberto = expandidos[equip.id];
                            const abaAtual = abasAtivas[equip.id] || 'cadastro';
                            const cardStyle = getStatusStyles(equip.status);

                            return (
                                <div key={equip.id} className={`bg-white rounded-xl border-l-[6px] ${cardStyle} shadow-sm transition-all overflow-hidden border-t border-r border-b border-slate-200`}>
                                    
                                    {/* Cabeçalho do Item */}
                                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpandir(equip.id)}>
                                        
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Botão de Expansão Azul à Esquerda */}
                                            <button className="text-blue-500 bg-transparent border-none p-0 cursor-pointer text-xl leading-none">
                                                <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} />
                                            </button>
                                            
                                            {/* Grid de Informações com Rótulos Pequenos */}
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-tight">Modelo</span>
                                                    <span className="text-sm font-semibold text-slate-800 uppercase leading-none mt-1">{equip.modelo}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-tight">Nº Série / Tag</span>
                                                    <span className="text-sm text-slate-600 font-medium italic leading-none mt-1">{equip.tag}</span>
                                                </div>
                                                <div className="hidden md:flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-tight">Tipo</span>
                                                    <span className="text-sm text-slate-600 leading-none mt-1">{equip.tipo}</span>
                                                </div>
                                                <div className="hidden md:flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-tight">Unidade</span>
                                                    <span className="text-sm text-slate-600 truncate leading-none mt-1">{equip.unidade?.nomeSistema || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-tight mb-1">Status Atual</span>
                                                    <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <button className="text-slate-400 hover:text-blue-600 bg-transparent border-none p-2 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }}>
                                                <FontAwesomeIcon icon={faFileMedical} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Conteúdo Expandido (Branco Puro para Contraste) */}
                                    {isAberto && (
                                        <div className="bg-white border-t border-slate-100">
                                            <div className="flex bg-slate-50/50 px-4 pt-2 gap-1 border-b border-slate-200">
                                                {['cadastro', 'acessorios', 'anexos', 'historico'].map(aba => (
                                                    <button key={aba} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer ${abaAtual === aba ? 'bg-white text-blue-600 border-x border-t border-slate-200 rounded-t-lg mb-[-1px] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]' : 'bg-transparent text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, aba)}>
                                                        {aba === 'cadastro' ? 'Dados' : aba === 'acessorios' ? 'Acessórios' : aba === 'anexos' ? 'Anexos' : 'Histórico'}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="p-6 min-h-[200px] animate-fadeIn">
                                                {abaAtual === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                                {abaAtual === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                                {abaAtual === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos || []} onUpdate={refetch} />}
                                                {abaAtual === 'historico' && <TabHistorico equipamento={equip} />}
                                                
                                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-all border-none cursor-pointer" onClick={() => navigate(`/cadastros/equipamentos/editar/${equip.id}`)}>
                                                        <FontAwesomeIcon icon={faEdit} /> Editar Registro
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-bold transition-all border-none cursor-pointer" onClick={() => abrirModalExclusao(equip)}>
                                                            <FontAwesomeIcon icon={faTrashAlt} /> Excluir Ativo
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
                            <p className="text-slate-400 font-medium text-lg">Nenhum ativo encontrado para os filtros selecionados.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default EquipamentosPage;