// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 17.0 - CORES VIVAS, BORDAS NÍTIDAS E FONTES DE ALTO CONTRASTE

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
    // >>> CONFIGURAÇÃO DE CORES DOS CARDS (VIVAS) <<<
    // ==========================================================================
    const getStatusTheme = (status) => {
        const s = status?.toLowerCase() || '';
        // bg-opacity-10 ou 20 deixa a cor do fundo leve mas "viva"
        if (s === 'operante') return { border: 'border-emerald-500', bg: 'bg-emerald-100/50' };
        if (s === 'inoperante') return { border: 'border-red-500', bg: 'bg-red-100/50' };
        if (s === 'emmanutencao') return { border: 'border-amber-500', bg: 'bg-amber-100/60' };
        if (s === 'usolimitado') return { border: 'border-blue-500', bg: 'bg-blue-100/50' };
        return { border: 'border-slate-300', bg: 'bg-white' };
    };

    if (loading && equipamentos.length === 0) return <div className="page-content-wrapper p-6"><SkeletonCard /></div>;

    return (
        <div className="page-content-wrapper p-6">
            <ModalConfirmacao isOpen={isOpen} onClose={closeModal} onConfirm={() => { removerEquipamento(modalData.id); closeModal(); }} title="Excluir" message="Deseja excluir este ativo?" isDestructive={true} />

            {/* HEADER */}
            <div className="flex justify-between items-center bg-[#1e293b] p-5 rounded-xl shadow-lg mb-8">
                <h1 className="text-xl font-bold text-white m-0 tracking-tight">Gerenciamento de Ativos</h1>
                <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-black transition-all border-none cursor-pointer flex items-center gap-2 shadow-md uppercase tracking-wider" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                    <FontAwesomeIcon icon={faPlus} /> Adicionar Equipamento
                </button>
            </div>

            {/* FILTROS */}
            <div className="mb-8 px-1">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-300">
                    <GlobalFilterBar 
                        searchTerm={controles.searchTerm} 
                        onSearchChange={controles.handleSearchChange} 
                        searchPlaceholder="Pesquisar por modelo, série ou patrimônio..."
                        selectFilters={[
                            { id: 'unidadeId', value: controles.filtros.unidadeId, onChange: (v) => controles.handleFilterChange('unidadeId', v), options: unidadesDisponiveis.map(u => ({ value: u.id, label: u.nomeSistema })), defaultLabel: 'Todas Unidades' },
                            { id: 'status', value: controles.filtros.status, onChange: (v) => controles.handleFilterChange('status', v), options: ["Operante", "Inoperante", "UsoLimitado", "EmManutencao"].map(s => ({ value: s, label: s })), defaultLabel: 'Todos Status' }
                        ]} 
                    />
                </div>
            </div>

            {/* LISTAGEM */}
            <div className="flex flex-col gap-5 px-1">
                {equipamentos.map(equip => {
                    const theme = getStatusTheme(equip.status);
                    const isAberto = expandidos[equip.id];
                    const abaAtual = abasAtivas[equip.id] || 'cadastro';

                    return (
                        /* CARD CONTAINER - BORDAS MAIS FORTES (border-slate-300) */
                        <div key={equip.id} className={`border border-slate-300 border-l-[12px] ${theme.border} ${theme.bg} rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-lg`}>
                            
                            <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => toggleExpandir(equip.id)}>
                                <div className="flex items-center gap-6 flex-1">
                                    
                                    {/* Botão (+) Redondo Azul */}
                                    <div className="text-white bg-[#3b82f6] rounded-full w-8 h-8 flex items-center justify-center shadow-md shrink-0">
                                        <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} size="lg" />
                                    </div>
                                    
                                    {/* GRID DE INFORMAÇÕES */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 flex-1">
                                        <div className="flex flex-col">
                                            {/* PARA EDITAR A COR DO RÓTULO (LABEL): mude 'text-slate-500' abaixo */}
                                            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Modelo</span>
                                            {/* PARA EDITAR A COR DO VALOR: mude 'text-slate-900' abaixo */}
                                            <span className="font-bold text-slate-900 text-[15px] uppercase leading-tight">{equip.modelo}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Nº Série / Tag</span>
                                            <span className="font-bold text-slate-800 text-[15px] italic leading-tight">{equip.tag}</span>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Tipo</span>
                                            <span className="font-bold text-slate-800 text-[15px] leading-tight">{equip.tipo}</span>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Unidade</span>
                                            <span className="font-bold text-slate-800 text-[15px] leading-tight truncate">{equip.unidade?.nomeSistema}</span>
                                        </div>

                                        <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">Status Atual</span>
                                            <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                        </div>
                                    </div>
                                </div>
                                
                                <button className="bg-white/50 hover:bg-blue-600 hover:text-white text-slate-400 w-10 h-10 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shadow-sm" onClick={e => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }}>
                                    <FontAwesomeIcon icon={faFileMedical} size="lg" />
                                </button>
                            </div>

                            {/* CONTEÚDO EXPANDIDO (MANTIDO BRANCO PARA LEITURA TÉCNICA) */}
                            {isAberto && (
                                <div className="bg-white border-t border-slate-300 p-8 shadow-inner">
                                    <div className="flex gap-8 mb-8 border-b border-slate-200 pb-3">
                                        {['cadastro', 'acessorios', 'anexos', 'historico'].map(aba => (
                                            <button key={aba} className={`bg-transparent border-none cursor-pointer font-black text-xs uppercase tracking-widest pb-2 transition-all ${abaAtiva === aba ? 'text-blue-600 border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => setAbasAtivas({...abasAtivas, [equip.id]: aba})}>
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

                                    <div className="flex justify-end gap-3 mt-10 pt-5 border-t border-slate-100">
                                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-2 rounded-lg font-black text-xs border-none cursor-pointer uppercase tracking-wider" onClick={() => navigate(`/cadastros/equipamentos/editar/${equip.id}`)}><FontAwesomeIcon icon={faEdit}/> Editar</button>
                                        {user?.role === 'admin' && <button className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2 rounded-lg font-black text-xs border-none cursor-pointer uppercase tracking-wider" onClick={() => openModal(equip)}><FontAwesomeIcon icon={faTrashAlt}/> Excluir</button>}
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