// Ficheiro: src/pages/ManutencoesPage.jsx
// VERSÃO 16.0 - CORES DE FUNDO NOS CARDS E LAYOUT FLAT INTEGRADO

import React, { useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { formatarData } from '../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faEye, faPenToSquare, faSpinner, faTrashAlt,
    faWrench, faClock, faHospital, faTag, faHashtag
} from '@fortawesome/free-solid-svg-icons';
import { useManutencoes } from '../hooks/useManutencoes';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../hooks/useModal';
import { useToast } from '../contexts/ToastContext';
import { deleteManutencao } from '../services/api';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';
import SkeletonCard from '../components/SkeletonCard';

// --- Funções de Estilo Tailwind ---

const getStatusStyles = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'agendada') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s === 'emandamento') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (s === 'aguardandoconfirmacao') return 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse';
    if (s === 'concluida') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s === 'cancelada') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

const getTipoStyles = (tipo) => {
    const t = tipo?.toLowerCase() || '';
    if (t === 'corretiva') return 'bg-rose-100 text-rose-700 border-rose-300';
    if (t === 'preventiva') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (t === 'calibracao') return 'bg-indigo-100 text-indigo-700 border-indigo-300';
    if (t === 'inspecao') return 'bg-sky-100 text-sky-700 border-sky-300';
    return 'bg-slate-100 text-slate-600 border-slate-300';
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
        { id: 'unidadeId', value: filtros.unidadeId, onChange: (v) => setFiltros(f => ({ ...f, unidadeId: v })), options: unidadesOptions, defaultLabel: 'Todas Unidades' },
        { id: 'equipamentoId', value: filtros.equipamentoId, onChange: (v) => setFiltros(f => ({ ...f, equipamentoId: v })), options: equipamentosOptions, defaultLabel: 'Todos Equipamentos' },
        { id: 'tipo', value: filtros.tipo, onChange: (v) => setFiltros(f => ({ ...f, tipo: v })), options: ["Preventiva", "Corretiva", "Calibracao", "Inspecao"], defaultLabel: 'Todos Tipos' },
        { id: 'status', value: filtros.status, onChange: (v) => setFiltros(f => ({ ...f, status: v })), options: statusOptions, defaultLabel: 'Todos Status' }
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
                        manutencoes.map(m => (
                            /* MUDANÇA AQUI: Adicionadas as classes manutencao-card e card-manutencao-tipo */
                            <div 
                                key={m.id} 
                                className={`manutencao-card card-manutencao-${m.tipo?.toLowerCase()} bg-white border-y border-r border-slate-200 border-l-[8px] ${getRowBorder(m.status)} shadow-sm rounded-xl overflow-hidden transition-all hover:shadow-md`}
                            >

                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-6 flex-1">
                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-1">

                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">OS / Status</span>
                                                <span className="font-black text-slate-800 text-sm leading-tight">{m.numeroOS}</span>
                                                <span className={`w-fit mt-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${getStatusStyles(m.status)}`}>
                                                    {m.status.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </div>

                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Equipamento</span>
                                                <span className="font-bold text-slate-800 text-sm truncate">{m.equipamento?.modelo}</span>
                                                <span className="text-[10px] text-slate-400 font-mono italic">{m.equipamento?.tag}</span>
                                            </div>

                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Nº Chamado</span>
                                                <span className="font-black text-slate-900 text-sm mt-1">
                                                    {m.numeroChamado ? (
                                                        <><FontAwesomeIcon icon={faHashtag} className="text-slate-300 mr-1" /> {m.numeroChamado}</>
                                                    ) : '---'}
                                                </span>
                                            </div>

                                            <div className="hidden md:flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Agendamento</span>
                                                <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faClock} className="text-[9px] text-slate-300" /> {formatarData(m.dataHoraAgendamentoInicio)}
                                                </span>
                                                <span className="text-[10px] text-slate-500">{formatarIntervaloHorario(m.dataHoraAgendamentoInicio, m.dataHoraAgendamentoFim)}</span>
                                            </div>

                                            <div className="hidden md:flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Unidade</span>
                                                <span className="font-bold text-slate-600 text-xs mt-1 truncate">
                                                    <FontAwesomeIcon icon={faHospital} className="text-slate-300 text-[9px] mr-1" />
                                                    {m.equipamento?.unidade?.nomeSistema || m.equipamento?.unidade?.nome || '---'}
                                                </span>
                                            </div>

                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tipo</span>
                                                <span className={`font-black text-[9px] px-2 py-0.5 rounded-full border uppercase w-fit mt-1 shadow-xs ${getTipoStyles(m.tipo)}`}>
                                                    {m.tipo}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <Link to={`/manutencoes/detalhes/${m.id}`} className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Ver Detalhes">
                                            <FontAwesomeIcon icon={faEye} />
                                        </Link>
                                        {user?.role === 'admin' && (
                                            <button onClick={() => openDeleteModal(m)} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border-none cursor-pointer" title="Excluir">
                                                <FontAwesomeIcon icon={faTrashAlt} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center text-slate-400 font-medium italic bg-white rounded-2xl border border-dashed border-slate-200">
                            Nenhuma manutenção encontrada.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
export default ManutencoesPage;