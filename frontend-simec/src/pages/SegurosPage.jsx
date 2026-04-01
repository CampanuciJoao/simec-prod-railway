// Ficheiro: src/pages/SegurosPage.jsx
// VERSÃO 12.0 - ALINHAMENTO EXECUTIVO E CORES DE STATUS INTELIGENTES

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeguros } from '../hooks/useSeguros';
import { useModal } from '../hooks/useModal';
import { useToast } from '../contexts/ToastContext';
import { formatarData } from '../utils/timeUtils';
import { uploadAnexoSeguro, deleteAnexoSeguro } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faTrashAlt, faSpinner, faEdit, faPlusCircle, 
    faMinusCircle, faPaperclip, faShieldAlt, faFilePdf, 
    faUpload, faExternalLinkAlt, faTag, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import GlobalFilterBar from '../components/GlobalFilterBar';
import ModalConfirmacao from '../components/ModalConfirmacao';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// FUNÇÃO PARA DETERMINAR O STATUS VISUAL (IGUAL AO PADRÃO DE EQUIPAMENTOS)
const getStatusUI = (dataFim, statusOriginal) => {
    if (statusOriginal === 'Cancelado') {
        return { border: 'border-l-slate-400', bg: 'bg-slate-50', label: 'CANCELADO', badge: 'bg-slate-200 text-slate-700 border-slate-300' };
    }

    const hoje = new Date();
    const vencimento = new Date(dataFim);
    const diffDays = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { border: 'border-l-[#ef4444]', bg: 'bg-[#fef2f2]', label: 'EXPIRADO', badge: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (diffDays <= 30) {
        return { border: 'border-l-[#f59e0b]', bg: 'bg-[#fffbeb]', label: 'VENCIMENTO PRÓXIMO', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { border: 'border-l-[#10b981]', bg: 'bg-[#f0fdf4]', label: 'VIGENTE', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
};

function SegurosPage() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [expandidos, setExpandidos] = useState({});
    const [uploadingId, setUploadingId] = useState(null);

    const {
        seguros,
        segurosOriginais,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        filtros,
        setFiltros,
        removerSeguro,
        refetch
    } = useSeguros();
    
    const { isOpen: isDeleteModalOpen, modalData: seguroParaDeletar, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();

    const toggleExpandir = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const confirmarExclusao = async () => {
        if (!seguroParaDeletar) return;
        try {
            await removerSeguro(seguroParaDeletar.id);
            addToast('Seguro excluído com sucesso!', 'success');
        } catch (err) {
            addToast('Erro ao excluir seguro.', 'error');
        } finally {
            closeDeleteModal();
        }
    };

    const handleUploadArquivo = async (seguroId, event) => {
        const file = event.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('apolices', file);
        setUploadingId(seguroId);
        try {
            await uploadAnexoSeguro(seguroId, formData);
            addToast('Documento anexado com sucesso!', 'success');
            refetch();
        } catch (err) {
            addToast('Erro ao anexar arquivo.', 'error');
        } finally {
            setUploadingId(null);
        }
    };

    const handleDeleteAnexo = async (seguroId, anexoId) => {
        if (!window.confirm("Remover este documento?")) return;
        try {
            await deleteAnexoSeguro(seguroId, anexoId);
            addToast('Documento removido.', 'success');
            refetch();
        } catch (err) {
            addToast('Erro ao remover.', 'error');
        }
    };
    
    const seguradorasUnicas = useMemo(() => [...new Set((segurosOriginais || []).map(s => s.seguradora).filter(Boolean))].sort(), [segurosOriginais]);
    const statusDbOptions = ["Ativo", "Expirado", "Cancelado"];
    
    const selectFiltersConfig = [
        { id: 'seguradora', value: filtros.seguradora, onChange: (v) => setFiltros(f => ({ ...f, seguradora: v })), options: seguradorasUnicas, defaultLabel: 'Todas Seguradoras' },
        { id: 'status', value: filtros.status, onChange: (v) => setFiltros(f => ({ ...f, status: v })), options: statusDbOptions, defaultLabel: 'Todos Status' },
    ];

    if (loading && seguros.length === 0) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;

    return (
        <>
            <ModalConfirmacao isOpen={isDeleteModalOpen} onClose={closeDeleteModal} onConfirm={confirmarExclusao} title="Excluir Seguro" message={`Deseja excluir a apólice nº ${seguroParaDeletar?.apoliceNumero}?`} isDestructive={true} />
            
            <div className="page-content-wrapper pb-20">
                <div className="page-title-card shadow-xl bg-[#1e293b] border-none mb-8">
                    <h1 className="page-title-internal flex items-center gap-3 text-white font-bold uppercase tracking-tight">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-blue-400" />
                        Gestão de Seguros e Coberturas
                    </h1>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer uppercase text-xs" onClick={() => navigate('/seguros/adicionar')}>
                        <FontAwesomeIcon icon={faPlus} /> Novo Seguro
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 mx-1">
                    <GlobalFilterBar searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)} searchPlaceholder="Buscar apólice ou seguradora..." selectFilters={selectFiltersConfig} />
                </div>

                <div className="px-1 flex flex-col gap-3">
                    {seguros.length > 0 ? (
                        seguros.map(seguro => {
                            const isAberto = !!expandidos[seguro.id];
                            const ui = getStatusUI(seguro.dataFim, seguro.status);
                            
                            return (
                                <div key={seguro.id} className={`bg-white border-y border-r border-slate-200 border-l-[10px] ${ui.border} rounded-xl shadow-sm overflow-hidden transition-all`}>
                                    
                                    {/* CABEÇALHO DO CARD (CLICÁVEL) */}
                                    <div className={`p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors ${ui.bg}`} onClick={() => toggleExpandir(seguro.id)}>
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="text-blue-500 w-6 flex items-center justify-center">
                                                <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} size="lg" />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Nº Apólice</span>
                                                    <span className="font-black text-slate-800 text-sm leading-tight">{seguro.apoliceNumero}</span>
                                                    <span className={`w-fit mt-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${ui.badge}`}>{ui.label}</span>
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Seguradora</span>
                                                    <span className="font-bold text-slate-700 text-sm">{seguro.seguradora}</span>
                                                </div>

                                                <div className="hidden md:flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Objeto Segurado</span>
                                                    <span className="font-bold text-slate-700 text-sm truncate">
                                                        {seguro.equipamento?.modelo || seguro.unidade?.nomeSistema || 'Cobertura Geral'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vencimento</span>
                                                    <span className="font-black text-slate-700 text-sm">{formatarData(seguro.dataFim)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 ml-4" onClick={e => e.stopPropagation()}>
                                            <FontAwesomeIcon 
                                                icon={faPaperclip} 
                                                className={seguro.anexos?.length > 0 ? 'text-green-500' : 'text-slate-300'} 
                                                title={seguro.anexos?.length > 0 ? "Documentos anexados" : "Sem anexos"} 
                                            />
                                            <button className="bg-transparent border-none text-slate-400 hover:text-blue-600 p-2 cursor-pointer transition-colors" onClick={() => navigate(`/seguros/detalhes/${seguro.id}`)}>
                                                <FontAwesomeIcon icon={faShieldAlt} size="lg" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ÁREA EXPANSÍVEL (DADOS TÉCNICOS E FINANCEIROS) */}
                                    {isAberto && (
                                        <div className="bg-white border-t border-slate-100 p-6 animate-fadeIn">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                
                                                {/* COLUNA 1: VALORES LMI */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-blue-500">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Prêmio (Custo)</span>
                                                        <span className="font-black text-blue-600 text-base">{formatarMoeda(seguro.premioTotal)}</span>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Danos Elétricos</span>
                                                        <span className="font-bold text-slate-700 text-sm">{formatarMoeda(seguro.lmiDanosEletricos)}</span>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Roubo / Furto</span>
                                                        <span className="font-bold text-slate-700 text-sm">{formatarMoeda(seguro.lmiRoubo)}</span>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Resp. Civil</span>
                                                        <span className="font-bold text-slate-700 text-sm">{formatarMoeda(seguro.lmiResponsabilidadeCivil)}</span>
                                                    </div>
                                                </div>

                                                {/* COLUNA 2: ANEXOS E AÇÕES */}
                                                <div className="flex flex-col justify-between gap-4">
                                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
                                                            <FontAwesomeIcon icon={faTag} /> Cobertura / Documentos
                                                        </span>
                                                        
                                                        {seguro.anexos?.length > 0 ? (
                                                            <div className="flex flex-col gap-2 mb-4">
                                                                {seguro.anexos.map(anexo => (
                                                                    <div key={anexo.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-xs">
                                                                        <a href={`${API_BASE_URL}/${anexo.path}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-blue-600 no-underline hover:underline flex items-center gap-2">
                                                                            <FontAwesomeIcon icon={faFilePdf} className="text-red-500" /> {anexo.nomeOriginal}
                                                                        </a>
                                                                        <button onClick={() => handleDeleteAnexo(seguro.id, anexo.id)} className="text-slate-300 hover:text-red-500 border-none bg-transparent cursor-pointer transition-colors"><FontAwesomeIcon icon={faTrashAlt} size="xs" /></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <p className="text-xs italic text-slate-400 mb-4">Nenhum PDF da apólice anexado.</p>}

                                                        <div className="flex flex-wrap gap-2">
                                                            <label className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center gap-2 shadow-xs uppercase">
                                                                <FontAwesomeIcon icon={uploadingId === seguro.id ? faSpinner : faUpload} spin={uploadingId === seguro.id} />
                                                                {uploadingId === seguro.id ? 'Subindo...' : 'Anexar PDF'}
                                                                <input type="file" style={{ display: 'none' }} onChange={(e) => handleUploadArquivo(seguro.id, e)} accept=".pdf,image/*" disabled={uploadingId !== null} />
                                                            </label>
                                                            <button className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all uppercase shadow-xs" onClick={() => navigate(`/seguros/editar/${seguro.id}`)}>
                                                                <FontAwesomeIcon icon={faEdit} /> Editar Dados
                                                            </button>
                                                            <button className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all uppercase shadow-xs" onClick={() => openDeleteModal(seguro)}>
                                                                <FontAwesomeIcon icon={faTrashAlt} /> Excluir
                                                            </button>
                                                        </div>
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
                            Nenhum seguro encontrado para os filtros aplicados.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default SegurosPage;