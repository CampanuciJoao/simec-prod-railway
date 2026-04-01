// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 21.0 - DESIGN FIEL À SEGUNDA FOTO (BORDAS SÓLIDAS E CLEAN)

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

    const toggleExpandir = (e, id) => {
        e.stopPropagation(); 
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
        if (!abasAtivas[id]) setAbasAtivas(prev => ({ ...prev, [id]: 'cadastro' }));
    };

    const trocarAba = (equipId, nomeAba) => setAbasAtivas(prev => ({ ...prev, [equipId]: nomeAba }));

    if (loading && equipamentos.length === 0) return <div className="page-content-wrapper p-6"><SkeletonCard /></div>;

    return (
        <div className="page-content-wrapper p-6 bg-[#f8fafc] min-h-screen font-sans">
            <ModalConfirmacao isOpen={isOpen} onClose={closeModal} onConfirm={() => { removerEquipamento(modalData.id); closeModal(); }} title="Excluir" message="Deseja excluir este registro?" isDestructive={true} />

            {/* HEADER - BOTÃO ADICIONAR REDUZIDO (text-[10px] uppercase) */}
            <div className="flex justify-between items-center bg-[#1e293b] p-4 rounded-xl shadow-lg mb-8">
                <h1 className="text-lg font-bold text-white m-0 tracking-tight uppercase">Gerenciamento de Ativos</h1>
                <button 
                    className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black transition-all border-none cursor-pointer flex items-center gap-2 shadow-md uppercase tracking-wider" 
                    onClick={() => navigate('/cadastros/equipamentos/adicionar')}
                >
                    <FontAwesomeIcon icon={faPlus} /> Adicionar Equipamento
                </button>
            </div>

            {/* LISTAGEM */}
            <div className="flex flex-col gap-4">
                {equipamentos.map(equip => {
                    const status = equip.status?.toLowerCase() || '';
                    const isAberto = !!expandidos[equip.id];
                    const abaAtivaDesteCard = abasAtivas[equip.id] || 'cadastro';

                    // DEFINIÇÃO DAS CORES SÓLIDAS (Igual à foto 2)
                    let borderClass = "border-l-slate-400"; 
                    let bgClass = "bg-white";
                    
                    if (status === 'operante') { borderClass = "border-l-[#10b981]"; bgClass = "bg-[#f0fdf4]"; }
                    if (status === 'inoperante') { borderClass = "border-l-[#ef4444]"; bgClass = "bg-[#fef2f2]"; }
                    if (status === 'emmanutencao') { borderClass = "border-l-[#f59e0b]"; bgClass = "bg-[#fffbeb]"; }
                    if (status === 'usolimitado') { borderClass = "border-l-[#3b82f6]"; bgClass = "bg-[#eff6ff]"; }

                    return (
                        /* CARD COM BORDA LATERAL SÓLIDA E OUTLINE CINZA FINO */
                        <div key={equip.id} className={`bg-white border-y border-r border-slate-200 border-l-[10px] ${borderClass} rounded-xl shadow-sm transition-all mb-2`}>
                            
                            <div className={`p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors ${bgClass}`} onClick={(e) => toggleExpandir(e, equip.id)}>
                                <div className="flex items-center gap-6 flex-1">
                                    
                                    {/* BOTÃO EXPANDIR AZUL */}
                                    <div className="bg-white text-[#3b82f6] rounded-full w-8 h-8 flex items-center justify-center shadow-sm shrink-0 border border-blue-100">
                                        <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} size="lg" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                                        <div className="flex flex-col">
                                            {/* RÓTULO (LABEL) - Para mudar a cor: edite 'text-slate-500' */}
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Modelo</span>
                                            {/* VALOR (DADO) - Para mudar a cor: edite 'text-slate-800' */}
                                            <span className="font-bold text-slate-800 text-[14px] uppercase leading-none mt-1">{equip.modelo}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Nº Série / Tag</span>
                                            <span className="font-bold text-slate-800 text-[14px] italic leading-none mt-1">{equip.tag}</span>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Tipo</span>
                                            <span className="font-bold text-slate-800 text-[14px] leading-none mt-1">{equip.tipo}</span>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Unidade</span>
                                            <span className="font-bold text-slate-800 text-[14px] leading-none mt-1 truncate">{equip.unidade?.nomeSistema}</span>
                                        </div>

                                        <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Status Atual</span>
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
                                <div className="bg-white border-t border-slate-200 p-8">
                                    <div className="flex gap-8 mb-6 border-b border-slate-100 pb-2">
                                        {['cadastro', 'acessorios', 'anexos', 'historico'].map(aba => (
                                            <button 
                                                key={aba} 
                                                className={`bg-transparent border-none cursor-pointer font-black text-xs uppercase tracking-widest pb-2 transition-all ${abaAtivaDesteCard === aba ? 'text-blue-600 border-b-4 border-blue-600' : 'text-slate-400'}`} 
                                                onClick={() => trocarAba(equip.id, aba)}
                                            >
                                                {aba === 'cadastro' ? 'Cadastro' : aba}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="min-h-[200px] text-slate-900">
                                        {abaAtivaDesteCard === 'cadastro' && <TabCadastro equipamentoInicial={equip} />}
                                        {abaAtivaDesteCard === 'acessorios' && <TabAcessorios equipamentoId={equip.id} />}
                                        {abaAtivaDesteCard === 'anexos' && <TabAnexos equipamentoId={equip.id} anexosIniciais={equip.anexos} onUpdate={refetch} />}
                                        {abaAtivaDesteCard === 'historico' && <TabHistorico equipamento={equip} />}
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