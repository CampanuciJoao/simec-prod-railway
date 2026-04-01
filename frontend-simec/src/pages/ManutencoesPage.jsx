// Ficheiro: src/pages/ManutencoesPage.jsx
// VERSÃO 13.0 - CARDS EXPANSÍVEIS, DRILL-DOWN E UI DE ALTA PERFORMANCE

import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { formatarData } from '../utils/timeUtils'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faEye, faPenToSquare, faSpinner, faTrashAlt, 
    faWrench, faClock, faHospital, faTag, faPlusCircle, 
    faMinusCircle, faUser, faFileAlt, faHashtag 
} from '@fortawesome/free-solid-svg-icons';
import { useManutencoes } from '../hooks/useManutencoes';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../hooks/useModal';
import { useToast } from '../contexts/ToastContext';
import { deleteManutencao } from '../services/api';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';
import ModalCancelamento from '../components/ModalCancelamento';
import SkeletonCard from '../components/SkeletonCard';

// --- Funções Auxiliares de Estilo Tailwind ---
const getStatusStyles = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'agendada') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s === 'emandamento') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (s === 'aguardandoconfirmacao') return 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse';
    if (s === 'concluida') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s === 'cancelada') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

const getRowBorder = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'agendada') return 'border-l-blue-500';
    if (s === 'emandamento') return 'border-l-yellow-500';
    if (s === 'aguardandoconfirmacao') return 'border-l-orange-500';
    if (s === 'concluida') return 'border-l-emerald-500';
    if (s === 'cancelada') return 'border-l-red-500';
    return 'border-l-slate-300';
};

const formatarIntervaloHorario = (dataInicioISO, dataFimISO) => {
    if (!dataInicioISO) return '-';
    try {
        const options = { hour: '2-digit', minute: '2-digit' };
        const inicio = new Date(dataInicioISO).toLocaleTimeString('pt-BR', options);
        if (!dataFimISO) return inicio;
        const fim = new Date(dataFimISO).toLocaleTimeString('pt-BR', options);
        return `${inicio} - ${fim}`;
    } catch (e) { return "Inválido"; }
};

function ManutencoesPage() {
    const { addToast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const {
        manutencoes, equipamentos, unidadesDisponiveis,
        loading, error, searchTerm, setSearchTerm,
        filtros, setFiltros, refetch
    } = useManutencoes();

    // ESTADO PARA CONTROLE DE QUAIS CARDS ESTÃO ABERTOS
    const [expandidos, setExpandidos] = useState({});

    // Sincroniza filtros vindos do BI (Tipo e Equipamento)
    useEffect(() => {
        if (location.state?.filtroTipoInicial || location.state?.filtroEquipamentoId) {
            setFiltros(prev => ({ 
                ...prev, 
                tipo: location.state.filtroTipoInicial || prev.tipo,
                equipamentoId: location.state.filtroEquipamentoId || prev.equipamentoId 
            }));
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, setFiltros, navigate, location.pathname]);
    
    useEffect(() => {
        const intervalId = setInterval(() => { refetch(); }, 30 * 1000);
        return () => clearInterval(intervalId);
    }, [refetch]);

    const { isOpen: isDeleteModalOpen, modalData: manutencaoParaDeletar, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
    const { isOpen: isCancelModalOpen, modalData: manutencaoParaCancelar, openModal: openCancelModal, closeModal: closeCancelModal } = useModal();
    
    // Alterna o estado de expansão de um card
    const toggleExpandir = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleConfirmarExclusao = async () => {
        if (!manutencaoParaDeletar) return;
        try {
            await deleteManutencao(manutencaoParaDeletar.id);
            addToast('Ordem de Serviço excluída.', 'success');
            refetch();
        } catch (err) { addToast('Erro ao excluir.', 'error'); } finally { closeDeleteModal(); }
    };

    const unidadesOptions = useMemo(() => (unidadesDisponiveis || []).map(u => ({ value: u.id, label: u.nomeSistema })), [unidadesDisponiveis]);
    const equipamentosOptions = useMemo(() => (equipamentos || []).map(eq => ({ value: eq.id, label: `${eq.modelo} (${eq.tag})` })), [equipamentos]);
    const statusOptions = ["Agendada", "EmAndamento", "Concluida", "Cancelada", "AguardandoConfirmacao"].map(s => ({ value: s, label: s.replace(/([A-Z])/g, ' $1').trim() }));

    const selectFiltersConfig = [
        { id: 'unidadeId', value: filtros.unidadeId, onChange: (v) => setFiltros(f => ({...f, unidadeId: v})), options: unidadesOptions, defaultLabel: 'Todas Unidades' },
        { id: 'equipamentoId', value: filtros.equipamentoId, onChange: (v) => setFiltros(f => ({...f, equipamentoId: v})), options: equipamentosOptions, defaultLabel: 'Todos Equipamentos' },
        { id: 'tipo', value: filtros.tipo, onChange: (v) => setFiltros(f => ({...f, tipo: v})), options: ["Preventiva", "Corretiva", "Calibracao", "Inspecao"], defaultLabel: 'Todos Tipos' },
        { id: 'status', value: filtros.status, onChange: (v) => setFiltros(f => ({...f, status: v})), options: statusOptions, defaultLabel: 'Todos Status' }
    ];

    if (loading && manutencoes.length === 0) {
        return (
            <div className="page-content-wrapper">
                <div className="page-title-card bg-slate-800 border-none shadow-lg"><h1 className="page-title-internal text-white">Ordens de Serviço</h1></div>
                <div className="space-y-4 mt-8 px-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
            </div>
        );
    }

    return (
        <>
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={closeDeleteModal} onConfirm={handleConfirmarExclusao} title="Excluir OS" message={`Deseja apagar a OS nº ${manutencaoParaDeletar?.numeroOS}?`} isDestructive={true} />
            <ModalCancelamento manutencao={manutencaoParaCancelar} isOpen={isCancelModalOpen} onClose={closeCancelModal} onCancelConfirm={refetch} />

            <div className="page-content-wrapper pb-20">
                <div className="page-title-card shadow-xl bg-slate-800 border-none mb-8">
                    <h1 className="page-title-internal flex items-center gap-3 text-white font-bold">
                        <FontAwesomeIcon icon={faWrench} className="text-yellow-400" />
                        Gerenciamento de Manutenções
                    </h1>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer" onClick={() => navigate('/manutencoes/agendar')}>
                        <FontAwesomeIcon icon={faPlus} /> Agendar Nova
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 mx-1">
                    <GlobalFilterBar searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)} searchPlaceholder="Buscar por OS ou descrição..." selectFilters={selectFiltersConfig} />
                </div>

                <div className="px-1 flex flex-col gap-3">
                    {manutencoes.length > 0 ? (
                        manutencoes.map(m => {
                            const isAberto = !!expandidos[m.id];
                            return (
                                <div key={m.id} className={`bg-white border-y border-r border-slate-200 border-l-[8px] ${getRowBorder(m.status)} shadow-sm rounded-xl overflow-hidden transition-all`}>
                                    
                                    {/* CABEÇALHO DO CARD (CLICÁVEL) */}
                                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpandir(m.id)}>
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="text-blue-500 w-6 flex items-center justify-center">
                                                <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} size="lg" />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">OS / Status</span>
                                                    <span className="font-black text-slate-800 text-sm leading-tight">{m.numeroOS}</span>
                                                    <span className={`w-fit mt-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${getStatusStyles(m.status)}`}>
                                                        {m.status.replace(/([A-Z])/g, ' $1').trim()}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Equipamento</span>
                                                    <span className="font-bold text-slate-800 text-sm truncate">{m.equipamento?.modelo}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono italic">{m.equipamento?.tag}</span>
                                                </div>

                                                <div className="hidden md:flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Agendamento</span>
                                                    <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                                                        <FontAwesomeIcon icon={faClock} className="text-[9px] text-slate-300" /> {formatarData(m.dataHoraAgendamentoInicio)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">{formatarIntervaloHorario(m.dataHoraAgendamentoInicio, m.dataHoraAgendamentoFim)}</span>
                                                </div>

                                                <div className="hidden md:flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Unidade</span>
                                                    <span className="font-bold text-slate-600 text-xs mt-1 flex items-center gap-1">
                                                        <FontAwesomeIcon icon={faHospital} className="text-slate-300 text-[9px]" /> {m.equipamento?.unidade?.nomeSistema}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo</span>
                                                    <span className="font-bold text-slate-500 text-xs bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5 w-fit mt-1">{m.tipo}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AÇÕES RÁPIDAS NA DIREITA */}
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <Link to={`/manutencoes/detalhes/${m.id}`} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                                <FontAwesomeIcon icon={faEye} />
                                            </Link>
                                            {user?.role === 'admin' && (
                                                <button onClick={() => openDeleteModal(m)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border-none cursor-pointer">
                                                    <FontAwesomeIcon icon={faTrashAlt} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* ÁREA EXPANSÍVEL (DETALHES ADICIONAIS) */}
                                    {isAberto && (
                                        <div className="bg-slate-50/50 border-t border-slate-100 p-6 animate-fadeIn">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faFileAlt} /> Descrição do Problema / Serviço
                                                        </span>
                                                        <p className="text-sm text-slate-700 bg-white p-4 rounded-lg border border-slate-200 leading-relaxed shadow-xs min-h-[80px]">
                                                            {m.descricaoProblemaServico || "Nenhuma descrição informada."}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                                <FontAwesomeIcon icon={faUser} /> Técnico Responsável
                                                            </span>
                                                            <span className="font-bold text-slate-700">{m.tecnicoResponsavel || "Não designado"}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                                <FontAwesomeIcon icon={faHashtag} /> Número do Chamado
                                                            </span>
                                                            <span className="font-black text-slate-900 text-base">{m.numeroChamado || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="mt-4 flex justify-end gap-3">
                                                        {m.status === 'Agendada' && (
                                                            <button 
                                                                className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all shadow-sm cursor-pointer"
                                                                onClick={() => navigate(`/manutencoes/editar/${m.id}`)}
                                                            >
                                                                <FontAwesomeIcon icon={faPenToSquare} /> Editar Agendamento
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md cursor-pointer"
                                                            onClick={() => navigate(`/manutencoes/detalhes/${m.id}`)}
                                                        >
                                                            Gerenciar O.S. Completa
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center text-slate-400 font-medium italic bg-white rounded-2xl border border-dashed border-slate-200">
                            Nenhuma manutenção encontrada para os filtros aplicados.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default ManutencoesPage;