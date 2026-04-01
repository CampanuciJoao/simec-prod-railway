// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 18.0 - DESIGN PREMIUM (CORES DO USUÁRIO + BORDAS NÍTIDAS)

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faPlusCircle, faMinusCircle, faFileMedical, 
    faEdit, faTrashAlt, faSpinner, faHdd 
} from '@fortawesome/free-solid-svg-icons';

import { useEquipamentos } from '../hooks/useEquipamentos';
import { useModal } from '../hooks/useModal';
import { useAuth } from '../contexts/AuthContext';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';
import StatusSelector from '../components/StatusSelector';
import SkeletonCard from '../components/SkeletonCard';

import TabCadastro from '../components/abas-equipamento/TabCadastro';
import TabAcessorios from '../components/abas-equipamento/TabAcessorios';
import TabAnexos from '../components/abas-equipamento/TabAnexos';
import TabHistorico from '../components/abas-equipamento/TabHistorico';

function EquipamentosPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { equipamentos, unidadesDisponiveis, loading, setFiltros, controles, removerEquipamento, atualizarStatusLocalmente, refetch } = useEquipamentos();
    const { isOpen, modalData, openModal, closeModal } = useModal();
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
        if (!expandidos[id] && !abasAtivas[id]) setAbasAtivas(prev => ({ ...prev, [id]: 'cadastro' }));
    };

    const trocarAba = (equipId, nomeAba) => setAbasAtivas(prev => ({ ...prev, [equipId]: nomeAba }));

    // ==========================================================================
    // >>> CORES DOS CARDS (MANTIDAS CONFORME SOLICITADO) <<<
    // ==========================================================================
    const getStatusTheme = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'operante') return { border: 'border-emerald-500', bg: 'bg-emerald-200/60' };
        if (s === 'inoperante') return { border: 'border-red-500', bg: 'bg-red-200/60' };
        if (s === 'emmanutencao') return { border: 'border-amber-400', bg: 'bg-amber-200/60' };
        if (s === 'usolimitado') return { border: 'border-blue-500', bg: 'bg-blue-200/60' };
        return { border: 'border-slate-300', bg: 'bg-white' };
    };

    if (loading && equipamentos.length === 0) return <div className="page-content-wrapper p-6"><SkeletonCard /></div>;

    return (
        <div className="page-content-wrapper p-6 bg-slate-50 min-h-screen">
            <ModalConfirmacao isOpen={isOpen} onClose={closeModal} onConfirm={() => { removerEquipamento(modalData.id); closeModal(); }} title="Excluir" message="Excluir este ativo?" isDestructive={true} />

            {/* HEADER DARK */}
            <div className="flex justify-between items-center bg-[#1e293b] p-5 rounded-xl shadow-lg mb-8">
                <h1 className="text-xl font-bold text-white m-0 tracking-tight">Gerenciamento de Ativos</h1>
                <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-black transition-all border-none cursor-pointer flex items-center gap-2 shadow-md uppercase" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                    <FontAwesomeIcon icon={faPlus} /> Adicionar Equipamento
                </button>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="mb-8">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-300">
                    <GlobalFilterBar 
                        searchTerm={controles.searchTerm} 
                        onSearchChange={controles.handleSearchChange} 
                        searchPlaceholder="Pesquisar modelo ou tag..."
                        selectFilters={[
                            { id: 'unidadeId', value: controles.filtros.unidadeId, onChange: (v) => controles.handleFilterChange('unidadeId', v), options: unidadesDisponiveis.map(u => ({ value: u.id, label: u.nomeSistema })), defaultLabel: 'Todas Unidades' },
                            { id: 'status', value: controles.filtros.status, onChange: (v) => controles.handleFilterChange('status', v), options: ["Operante", "Inoperante", "UsoLimitado", "EmManutencao"].map(s => ({ value: s, label: s })), defaultLabel: 'Todos Status' }
                        ]} 
                    />
                </div>
            </div>

            {/* LISTAGEM DE CARDS */}
            <div className="flex flex-col gap-4">
                {equipamentos.map(equip => {
                    const theme = getStatusTheme(equip.status);
                    const isAberto = expandidos[equip.id];
                    const abaAtual = abasAtivas[equip.id] || 'cadastro';

                    return (
                        /* CONTAINER DO CARD - Bordas Nítidas (border-slate-300) */
                        <div key={equip.id} className={`bg-white border border-slate-300 border-l-[12px] ${theme.border} ${theme.bg} rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md mb-1`}>
                            
                            <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpandir(equip.id)}>
                                <div className="flex items-center gap-6 flex-1">
                                    
                                    {/* BOTÃO (+) IGUAL À FOTO: Círculo Azul, Símbolo Branco */}
                                    <div className="bg-[#3b82f6] text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md shrink-0">
                                        <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} size="lg" />
                                    </div>
                                    
                                    {/* GRID DE COLUNAS */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                                        <div className="flex flex-col">
                                            {/* COR DO RÓTULO: Mude 'text-slate-500' */}
                                            <span className="text-[11px] font-bold text-slate-500 uppercase mb-1">Modelo</span>
                                            {/* COR DO VALOR: Mude 'text-slate-900' */}
                                            <span className="font-black text-slate-900 text-sm uppercase leading-none">{equip.modelo}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase mb-1">Nº Série / Tag</span>
                                            <span className="font-bold text-slate-800 text-sm italic leading-none">{equip.tag}</span>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo</span>
                                            <span className="font-bold text-slate-800 text-sm leading-none">{equip.tipo}</span>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase mb-1">Unidade</span>
                                            <span className="font-bold text-slate-800 text-sm leading-none truncate">{equip.unidade?.nomeSistema}</span>
                                        </div>

                                        <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                            <span className="text-[11px] font-bold text-slate-500 uppercase mb-1">Status Atual</span>
                                            <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                        </div>
                                    </div>
                                </div>
                                
                                <button className="bg-transparent border-none text-slate-400 hover:text-blue-600 p-2 cursor-pointer transition-colors" onClick={e => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }}>
                                    <FontAwesomeIcon icon={faFileMedical} size="lg" />
                                </button>
                            </div>

                            {/* CONTEÚDO EXPANSÍVEL (BRANCO PURO) */}
                            {isAberto && (
                                <div className="bg-white border-t border-slate-200 p-8 shadow-inner">
                                    <div className="flex gap-8 mb-6 border-b border-slate-100 pb-2">
                                        {['cadastro', 'acessorios', 'anexos', 'historico'].map(aba => (
                                            <button key={aba} className={`bg-transparent border-none cursor-pointer font-black text-xs uppercase tracking-widest pb-2 transition-all ${abaAtual === aba ? 'text-blue-600 border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => setAbasAtivas({...abasAtivas, [equip.id]: aba})}>
                                                {aba === 'cadastro' ? 'Cadastro' : aba}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="min-h-[250px] text-slate-900">
                                        {abaAtiva === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                        {abaAtiva === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                        {abaAtiva === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos} onUpdate={refetch} />}
                                        {abaAtiva === 'historico' && <TabHistorico equipamento={equip} />}
                                    </div>

                                    <div className="flex justify-end gap-3 mt-10 pt-4 border-t border-slate-50">
                                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded font-bold text-xs border-none cursor-pointer" onClick={() => navigate(`/cadastros/equipamentos/editar/${equip.id}`)}><FontAwesomeIcon icon={faEdit}/> Editar</button>
                                        {user?.role === 'admin' && <button className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded font-bold text-xs border-none cursor-pointer" onClick={() => openModal(equip)}><FontAwesomeIcon icon={faTrashAlt}/> Excluir</button>}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default EquipamentosPage;