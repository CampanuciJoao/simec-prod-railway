// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 14.0 - DESIGN CLEAN ABSOLUTO (ALTO IMPACTO E LEITURA CLARA)

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

    // --- LÓGICA DE CORES CLEAN (Barra lateral vibrante + Fundo branco puro) ---
    const getStatusStyles = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'operante') return 'border-emerald-500';
        if (s === 'inoperante') return 'border-red-500';
        if (s === 'emmanutencao') return 'border-amber-400';
        if (s === 'usolimitado') return 'border-blue-500';
        return 'border-slate-300';
    };

    const selectFiltersConfig = useMemo(() => {
        const tipos = [...new Set(equipamentos.map(e => e.tipo).filter(Boolean))].sort();
        return [
            { id: 'unidadeId', value: controles.filtros.unidadeId, onChange: (v) => controles.handleFilterChange('unidadeId', v), options: unidadesDisponiveis.map(u => ({ value: u.id, label: u.nomeSistema })), defaultLabel: 'Todas Unidades' },
            { id: 'tipo', value: controles.filtros.tipo, onChange: (v) => controles.handleFilterChange('tipo', v), options: tipos.map(t => ({ value: t, label: t })), defaultLabel: 'Todos Tipos' },
            { id: 'status', value: controles.filtros.status, onChange: (v) => controles.handleFilterChange('status', v), options: ["Operante", "Inoperante", "UsoLimitado", "EmManutencao"].map(s => ({ value: s, label: s })), defaultLabel: 'Todos Status' }
        ];
    }, [equipamentos, unidadesDisponiveis, controles]);

    if (loading && equipamentos.length === 0) {
        return (
            <div className="page-content-wrapper">
                <div className="page-title-card bg-slate-900 border-none shadow-lg"><h1 className="page-title-internal">Ativos Tecnológicos</h1></div>
                <div className="space-y-4 mt-8 px-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
            </div>
        );
    }

    return (
        <>
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={fecharModalExclusao} onConfirm={() => { removerEquipamento(equipParaExcluir.id); fecharModalExclusao(); }} title="Excluir Ativo" message={`Deseja excluir o equipamento "${equipParaExcluir?.modelo}"?`} isDestructive={true} />

            <div className="page-content-wrapper pb-20">
                {/* Cabeçalho Minimalista com Fundo Escuro para Contraste */}
                <div className="page-title-card shadow-lg bg-[#0f172a] border-none mb-8">
                    <h1 className="page-title-internal font-bold text-white flex items-center gap-3">
                        <FontAwesomeIcon icon={faHdd} className="text-blue-500" />
                        Parque de Equipamentos
                    </h1>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-black shadow-md transition-all border-none cursor-pointer flex items-center gap-2" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> NOVO ATIVO
                    </button>
                </div>

                {/* Área de Filtros Branca com Borda Suave */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 mx-1">
                    <GlobalFilterBar 
                        searchTerm={controles.searchTerm} 
                        onSearchChange={controles.handleSearchChange} 
                        searchPlaceholder="Pesquisar por modelo, tag ou setor..."
                        selectFilters={selectFiltersConfig} 
                    />
                </div>

                {/* Grid de Ativos Clean */}
                <div className="flex flex-col gap-4">
                    {equipamentos.length > 0 ? (
                        equipamentos.map(equip => {
                            const isAberto = expandidos[equip.id];
                            const abaAtual = abasAtivas[equip.id] || 'cadastro';
                            const statusColor = getStatusStyles(equip.status);

                            return (
                                <div key={equip.id} className={`bg-white rounded-2xl border border-slate-200 border-l-[10px] ${statusColor} shadow-sm transition-all overflow-hidden`}>
                                    
                                    <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50" onClick={() => toggleExpandir(equip.id)}>
                                        
                                        <div className="flex items-center gap-6 flex-1">
                                            {/* Ícone de Expansão Azul */}
                                            <button className="text-blue-500 bg-transparent border-none p-0 cursor-pointer text-2xl leading-none">
                                                <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} />
                                            </button>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 flex-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-400 font-black tracking-tight">Modelo</span>
                                                    <span className="text-sm font-bold text-slate-800 uppercase mt-1 leading-tight">{equip.modelo}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-400 font-black tracking-tight">Nº Série / Tag</span>
                                                    <span className="text-sm text-slate-600 font-medium italic mt-1 leading-tight">{equip.tag}</span>
                                                </div>
                                                <div className="hidden md:flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-400 font-black tracking-tight">Tipo</span>
                                                    <span className="text-sm text-slate-600 mt-1 leading-tight">{equip.tipo}</span>
                                                </div>
                                                <div className="hidden md:flex flex-col">
                                                    <span className="text-[10px] uppercase text-slate-400 font-black tracking-tight">Unidade</span>
                                                    <span className="text-sm text-slate-600 truncate mt-1 leading-tight">{equip.unidade?.nomeSistema || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                                    <span className="text-[10px] uppercase text-slate-400 font-black tracking-tight mb-1">Status</span>
                                                    <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <button className="text-slate-300 hover:text-blue-600 bg-transparent border-none p-2 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }}>
                                                <FontAwesomeIcon icon={faFileMedical} size="lg" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sub-menu de Abas Internas Estilizado */}
                                    {isAberto && (
                                        <div className="bg-white border-t border-slate-100">
                                            <div className="flex bg-slate-50 px-6 pt-3 gap-6 border-b border-slate-200">
                                                {['cadastro', 'acessorios', 'anexos', 'historico'].map(aba => (
                                                    <button key={aba} className={`pb-3 text-[11px] font-black uppercase tracking-widest transition-all border-none bg-transparent cursor-pointer ${abaAtual === aba ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => trocarAba(equip.id, aba)}>
                                                        {aba === 'cadastro' ? 'Dados Técnicos' : aba}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="p-8 min-h-[250px] animate-fadeIn">
                                                {abaAtual === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                                {abaAtual === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                                {abaAtual === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos || []} onUpdate={refetch} />}
                                                {abaAtual === 'historico' && <TabHistorico equipamento={equip} />}
                                                
                                                {/* Botões de Ação de Rodapé */}
                                                <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
                                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs border-none cursor-pointer" onClick={() => navigate(`/cadastros/equipamentos/editar/${equip.id}`)}>
                                                        <FontAwesomeIcon icon={faEdit} /> Editar Cadastro
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-xs border-none cursor-pointer" onClick={() => abrirModalExclusao(equip)}>
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
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-slate-300 text-5xl mb-4" />
                            <p className="text-slate-400 font-bold text-xl uppercase tracking-tighter">Nenhum ativo encontrado</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default EquipamentosPage;