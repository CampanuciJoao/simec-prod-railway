// Ficheiro: src/pages/EquipamentosPage.jsx
// VERSÃO 20.0 - CORES VIVAS GARANTIDAS, BOTÃO REDUZIDO E DESIGN CLEAN

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
        <div className="page-content-wrapper p-6 bg-slate-50 min-h-screen">
            <ModalConfirmacao isOpen={isOpen} onClose={closeModal} onConfirm={() => { removerEquipamento(modalData.id); closeModal(); }} title="Excluir" message="Deseja excluir este registro?" isDestructive={true} />

            {/* HEADER - BOTÃO ADICIONAR REDUZIDO (px-3 py-1.5) */}
            <div className="flex justify-between items-center bg-[#1e293b] p-4 rounded-xl shadow-lg mb-8">
                <h1 className="text-lg font-bold text-white m-0 tracking-tight uppercase">Gerenciamento de Ativos</h1>
                <button 
                    className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-[11px] font-black transition-all border-none cursor-pointer flex items-center gap-2 shadow-md uppercase" 
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

                    // Definição manual de classes para o Tailwind não falhar
                    let colorClasses = "border-slate-300 bg-white"; // Padrão
                    if (status === 'operante') colorClasses = "border-emerald-500 bg-emerald-100";
                    if (status === 'inoperante') colorClasses = "border-red-500 bg-red-100";
                    if (status === 'emmanutencao') colorClasses = "border-amber-500 bg-amber-100";
                    if (status === 'usolimitado') colorClasses = "border-blue-500 bg-blue-100";

                    return (
                        <div key={equip.id} className={`border border-slate-300 border-l-[12px] ${colorClasses} rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-lg mb-2`}>
                            
                            <div className="p-4 flex items-center justify-between cursor-pointer" onClick={(e) => toggleExpandir(e, equip.id)}>
                                <div className="flex items-center gap-6 flex-1">
                                    
                                    <div className="bg-white text-[#3b82f6] rounded-full w-8 h-8 flex items-center justify-center shadow-md shrink-0 border border-blue-100">
                                        <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} size="lg" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                                        <div className="flex flex-col">
                                            {/* COR DO RÓTULO: text-slate-500 (Cinza) */}
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Modelo</span>
                                            {/* COR DO VALOR: text-black (Preto total para contraste) */}
                                            <span className="font-black text-black text-[14px] uppercase leading-tight">{equip.modelo}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Nº Série</span>
                                            <span className="font-bold text-slate-900 text-[14px] italic leading-tight">{equip.tag}</span>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Tipo</span>
                                            <span className="font-bold text-slate-900 text-[14px] leading-tight">{equip.tipo}</span>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Unidade</span>
                                            <span className="font-bold text-slate-900 text-[14px] leading-tight truncate">{equip.unidade?.nomeSistema}</span>
                                        </div>

                                        <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Status</span>
                                            <StatusSelector equipamento={equip} onSuccessUpdate={atualizarStatusLocalmente} />
                                        </div>
                                    </div>
                                </div>
                                
                                <button className="bg-white/50 hover:bg-blue-600 hover:text-white text-slate-400 w-10 h-10 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shadow-sm" onClick={e => { e.stopPropagation(); navigate(`/equipamentos/ficha-tecnica/${equip.id}`); }}>
                                    <FontAwesomeIcon icon={faFileMedical} size="lg" />
                                </button>
                            </div>

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
                                    
                                    <div className="min-h-[250px] text-slate-900">
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