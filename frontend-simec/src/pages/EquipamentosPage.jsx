// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 16.0 - DESIGN PREMIUM CLEAN (IDÊNTICO À REFERÊNCIA)

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

    // Sincroniza filtros iniciais vindos do Dashboard
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

    // --- LÓGICA DE CORES FIEL À IMAGEM (Barra grossa + Fundo sutil) ---
    const getStatusTheme = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'operante') return { border: 'border-emerald-500', bg: 'bg-emerald-200/70' };
        if (s === 'inoperante') return { border: 'border-red-500', bg: 'bg-red-200/70' };
        if (s === 'emmanutencao') return { border: 'border-amber-400', bg: 'bg-amber-200/70' };
        if (s === 'usolimitado') return { border: 'border-blue-500', bg: 'bg-blue-200/70' };
        return { border: 'border-slate-200', bg: 'bg-white' };
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
            <div className="page-content-wrapper p-6">
                <div className="page-title-card bg-[#1e293b] border-none"><h1 className="text-white">Carregando...</h1></div>
                <div className="space-y-4 mt-8"><SkeletonCard /><SkeletonCard /></div>
            </div>
        );
    }

    return (
        <div className="page-content-wrapper p-6">
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={fecharModalExclusao} onConfirm={() => { removerEquipamento(equipParaExcluir.id); fecharModalExclusao(); }} title="Excluir Ativo" message={`Deseja excluir o equipamento "${equipParaExcluir?.modelo}"?`} isDestructive={true} />

            {/* CABEÇALHO ESCURO (IGUAL À FOTO) */}
            <div className="flex justify-between items-center bg-[#1e293b] p-4 rounded-lg shadow-md mb-8">
                <h1 className="text-lg font-medium text-white m-0">Gerenciamento de Equipamentos</h1>
                <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2" onClick={() => navigate('/cadastros/equipamentos/adicionar')}>
                    <FontAwesomeIcon icon={faPlus} /> Adicionar Equipamento
                </button>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="mb-6 px-1">
                <GlobalFilterBar 
                    searchTerm={controles.searchTerm} 
                    onSearchChange={controles.handleSearchChange} 
                    searchPlaceholder="Buscar por modelo ou tag..."
                    selectFilters={selectFiltersConfig} 
                />
            </div>

            {/* LISTAGEM DE CARDS (ESTILO IDENTICO AO REFERENCIADO) */}
            <div className="flex flex-col gap-4">
                {equipamentos.length > 0 ? (
                    equipamentos.map(equip => {
                        const theme = getStatusTheme(equip.status);
                        const isAberto = expandidos[equip.id];
                        const abaAtual = abasAtivas[equip.id] || 'cadastro';

                        return (
                            <div key={equip.id} className={`border border-slate-200 border-l-[10px] ${theme.border} ${theme.bg} rounded-xl shadow-sm overflow-hidden transition-all mb-1`}>
                                
                                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpandir(equip.id)}>
                                    
                                    <div className="flex items-center gap-5 flex-1">
                                        {/* Ícone de Expansão Azul Redondo */}
                                        <div className="text-[#3b82f6] bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm shrink-0">
                                            <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} size="lg" />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] text-slate-500 font-medium mb-1">Modelo</span>
                                                <span className="font-bold text-slate-700 text-sm uppercase leading-none">{equip.modelo}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] text-slate-500 font-medium mb-1">Nº Série (Tag)</span>
                                                <span className="font-medium text-slate-700 text-sm leading-none">{equip.tag}</span>
                                            </div>
                                            <div className="hidden md:flex flex-col">
                                                <span className="text-[11px] text-slate-500 font-medium mb-1">Tipo</span>
                                                <span className="text-slate-700 text-sm leading-none">{equip.tipo}</span>
                                            </div>
                                            <div className="hidden md:flex flex-col">
                                                <span className="text-[11px] text-slate-500 font-medium mb-1">Unidade</span>
                                                <span className="text-slate-700 text-sm leading-none truncate">{equip.unidade?.nomeSistema}</span>
                                            </div>
                                            <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                                <span className="text-[11px] text-slate-500 font-medium mb-1">Status Atual</span>
                                                <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                            </div>
                                        </div>
                                    </div>

                                    <button className="bg-transparent border-none text-slate-400 hover:text-blue-600 p-2 cursor-pointer transition-colors" onClick={e => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }} title="Ficha Técnica">
                                        <FontAwesomeIcon icon={faFileMedical} />
                                    </button>
                                </div>

                                {/* CONTEÚDO EXPANSÍVEL (ABAS BRANCAS) */}
                                {isAberto && (
                                    <div className="bg-white border-t border-slate-100 p-6 shadow-inner">
                                        <div className="flex gap-6 mb-6 border-b border-slate-100 pb-2">
                                            {['cadastro', 'acessorios', 'anexos', 'historico'].map(aba => (
                                                <button key={aba} className={`bg-transparent border-none cursor-pointer font-bold text-xs uppercase tracking-tighter pb-2 transition-all ${abaAtual === aba ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`} onClick={() => setAbasAtivas({...abasAtivas, [equip.id]: aba})}>
                                                    {aba === 'cadastro' ? 'Cadastro' : aba.charAt(0).toUpperCase() + aba.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <div className="min-h-[200px]">
                                            {abaAtual === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                            {abaAtual === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                            {abaAtual === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos} onUpdate={refetch} />}
                                            {abaAtual === 'historico' && <TabHistorico equipamento={equip} />}
                                        </div>

                                        <div className="flex justify-end gap-2 mt-8 pt-4 border-t border-slate-50">
                                            <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded font-bold text-xs border-none cursor-pointer" onClick={() => navigate(`/cadastros/equipamentos/editar/${equip.id}`)}><FontAwesomeIcon icon={faEdit}/> Editar</button>
                                            {user?.role === 'admin' && (
                                                <button className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-1.5 rounded font-bold text-xs border-none cursor-pointer" onClick={() => abrirModalExclusao(equip)}><FontAwesomeIcon icon={faTrashAlt}/> Excluir</button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-tighter">
                        Nenhum ativo encontrado
                    </div>
                )}
            </div>
        </div>
    );
}

export default EquipamentosPage;