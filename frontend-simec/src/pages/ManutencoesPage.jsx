// Ficheiro: src/pages/ManutencoesPage.jsx
// VERSÃO 12.0 - COM SUPORTE A DRILL-DOWN (FILTRO POR EQUIPAMENTO VINDO DO BI)

import React, { useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { formatarData } from '../utils/timeUtils'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faEye, 
    faPenToSquare, 
    faSpinner, 
    faExclamationTriangle, 
    faTrashAlt, 
    faBan,
    faWrench,
    faClock,
    faHospital,
    faTag
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

    // LÓGICA DE DRILL-DOWN: Sincroniza filtros vindos do BI (Tipo e Equipamento)
    useEffect(() => {
        if (location.state?.filtroTipoInicial || location.state?.filtroEquipamentoId) {
            setFiltros(prev => ({ 
                ...prev, 
                tipo: location.state.filtroTipoInicial || prev.tipo,
                equipamentoId: location.state.filtroEquipamentoId || prev.equipamentoId 
            }));
            // Limpa o estado para não re-filtrar se o usuário atualizar a página
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, setFiltros, navigate, location.pathname]);
    
    useEffect(() => {
        const intervalId = setInterval(() => { refetch(); }, 30 * 1000);
        return () => clearInterval(intervalId);
    }, [refetch]);

    const { isOpen: isDeleteModalOpen, modalData: manutencaoParaDeletar, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
    const { isOpen: isCancelModalOpen, modalData: manutencaoParaCancelar, openModal: openCancelModal, closeModal: closeCancelModal } = useModal();
    
    const handleConfirmarExclusao = async () => {
        if (!manutencaoParaDeletar) return;
        try {
            await deleteManutencao(manutencaoParaDeletar.id);
            addToast('Ordem de Serviço excluída.', 'success');
            refetch();
        } catch (err) { addToast('Erro ao excluir.', 'error'); } finally { closeDeleteModal(); }
    };

    const unidadesOptions = useMemo(() => (unidadesDisponiveis || []).map(u => ({ value: u.id, label: u.nomeSistema })), [unidadesDisponiveis]);
    const statusOptions = ["Agendada", "EmAndamento", "Concluida", "Cancelada", "AguardandoConfirmacao"].map(s => ({ value: s, label: s.replace(/([A-Z])/g, ' $1').trim() }));
    const equipamentosOptions = useMemo(() => (equipamentos || []).map(eq => ({ value: eq.id, label: `${eq.modelo} (${eq.tag})` })), [equipamentos]);

    const selectFiltersConfig = [
        { id: 'unidadeId', value: filtros.unidadeId, onChange: (v) => setFiltros(f => ({...f, unidadeId: v})), options: unidadesOptions, defaultLabel: 'Todas Unidades' },
        { id: 'equipamentoId', value: filtros.equipamentoId, onChange: (v) => setFiltros(f => ({...f, equipamentoId: v})), options: equipamentosOptions, defaultLabel: 'Todos Equipamentos' },
        { id: 'tipo', value: filtros.tipo, onChange: (v) => setFiltros(f => ({...f, tipo: v})), options: ["Preventiva", "Corretiva", "Calibracao", "Inspecao"], defaultLabel: 'Todos Tipos' },
        { id: 'status', value: filtros.status, onChange: (v) => setFiltros(f => ({...f, status: v})), options: statusOptions, defaultLabel: 'Todos Status' }
    ];

    if (loading && manutencoes.length === 0) {
        return (
            <div className="page-content-wrapper">
                <div className="page-title-card bg-slate-800 border-none shadow-lg"><h1 className="page-title-internal text-white">Gerenciamento de Manutenções</h1></div>
                <div className="space-y-4 mt-8 px-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
            </div>
        );
    }

    return (
        <>
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={closeDeleteModal} onConfirm={handleConfirmarExclusao} title="Excluir OS" message={`Tem certeza que deseja apagar a OS nº ${manutencaoParaDeletar?.numeroOS}?`} isDestructive={true} />
            <ModalCancelamento manutencao={manutencaoParaCancelar} isOpen={isCancelModalOpen} onClose={closeCancelModal} onCancelConfirm={refetch} />

            <div className="page-content-wrapper pb-20">
                <div className="page-title-card shadow-xl bg-slate-800 border-none mb-8">
                    <h1 className="page-title-internal flex items-center gap-3 text-white font-bold">
                        <FontAwesomeIcon icon={faWrench} className="text-yellow-400" />
                        Ordens de Serviço
                    </h1>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer" onClick={() => navigate('/manutencoes/agendar')}>
                        <FontAwesomeIcon icon={faPlus} /> Agendar Nova
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 mx-1">
                    <GlobalFilterBar searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)} searchPlaceholder="Buscar por OS ou descrição..." selectFilters={selectFiltersConfig} />
                </div>

                <div className="px-1 overflow-x-auto">
                    <table className="w-full border-separate border-spacing-y-3">
                        <thead>
                            <tr className="text-slate-400 text-[11px] font-black uppercase tracking-widest text-center">
                                <th className="pb-2 px-4 text-left">OS / Status</th>
                                <th className="pb-2 px-4 text-left">Equipamento</th>
                                <th className="pb-2 px-4">Agendamento</th>
                                <th className="pb-2 px-4">Tipo</th>
                                <th className="pb-2 px-4">Unidade</th>
                                <th className="pb-2 px-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {manutencoes.length > 0 ? (
                                manutencoes.map(m => (
                                    <tr key={m.id} className={`group bg-white hover:shadow-md transition-all border-l-[8px] ${getRowBorder(m.status)} shadow-sm rounded-xl`}>
                                        <td className="py-4 px-4 rounded-l-xl">
                                            <div className="font-black text-slate-800 text-sm">{m.numeroOS}</div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusStyles(m.status)}`}>
                                                {m.status.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><FontAwesomeIcon icon={faTag} className="text-xs" /></div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{m.equipamento?.modelo}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{m.equipamento?.tag}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faClock} className="text-[10px]" /> {formatarData(m.dataHoraAgendamentoInicio)}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">{formatarIntervaloHorario(m.dataHoraAgendamentoInicio, m.dataHoraAgendamentoFim)}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{m.tipo}</span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="text-xs font-medium text-slate-600 flex items-center justify-center gap-1">
                                                <FontAwesomeIcon icon={faHospital} className="text-slate-300 text-[10px]" />
                                                {m.equipamento?.unidade?.nomeSistema}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center rounded-r-xl">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link to={`/manutencoes/detalhes/${m.id}`} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                                    <FontAwesomeIcon icon={faEye} />
                                                </Link>
                                                {m.status === 'Agendada' && (
                                                    <Link to={`/manutencoes/editar/${m.id}`} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-500 rounded-lg hover:bg-yellow-500 hover:text-white transition-all shadow-sm">
                                                        <FontAwesomeIcon icon={faPenToSquare} />
                                                    </Link>
                                                )}
                                                {user?.role === 'admin' && (
                                                    <button onClick={() => openDeleteModal(m)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border-none cursor-pointer">
                                                        <FontAwesomeIcon icon={faTrashAlt} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="py-20 text-center text-slate-400 font-medium italic">Nenhuma manutenção encontrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

export default ManutencoesPage;