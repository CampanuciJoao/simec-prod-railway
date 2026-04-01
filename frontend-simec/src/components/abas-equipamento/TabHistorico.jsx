// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO 3.0 - COM LIMITE DE 20 ITENS E LINKS DIRETOS PARA OS

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // <<< ADICIONADO PARA NAVEGAÇÃO
import { getManutencoes, getOcorrenciasPorEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { exportarHistoricoEquipamentoPDF } from '../../utils/pdfUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faSpinner, faFilePdf, faChevronDown, faChevronUp, 
  faTools, faCheckCircle, faExclamationTriangle, faInfoCircle, 
  faUser, faWrench, faPaperclip, faFileDownload, faExternalLinkAlt, faFilter 
} from '@fortawesome/free-solid-svg-icons';
import DateInput from '../DateInput';

// Define a URL base para buscar os arquivos no servidor
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function TabHistorico({ equipamento }) {
  const navigate = useNavigate(); // Hook para mudar de página
  const { addToast } = useToast();
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const carregarDados = useCallback(async () => {
    if (!equipamento?.id) return;
    setLoading(true);
    try {
      const [manuts, ocorrs] = await Promise.all([
        getManutencoes({ equipamentoId: equipamento.id }),
        getOcorrenciasPorEquipamento(equipamento.id)
      ]);
      setHistoricoBruto({ manutencoes: manuts || [], ocorrencias: ocorrs || [] });
    } catch (error) {
      addToast('Erro ao carregar histórico.', 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id, addToast]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const toggleExpandir = (id) => {
    const novosExpandidos = new Set(itensExpandidos);
    novosExpandidos.has(id) ? novosExpandidos.delete(id) : novosExpandidos.add(id);
    setItensExpandidos(novosExpandidos);
  };

  // >>> LÓGICA DE PROCESSAMENTO E FILTRAGEM <<<
  const { linhaDoTempo, totalDisponivel } = useMemo(() => {
    // 1. Mapeia Manutenções (OS)
    const m = (historicoBruto.manutencoes || []).map(item => ({
      uniqueId: `os-${item.id}`,
      idOriginal: item.id, // ID real para o link de navegação
      data: item.dataConclusao || item.dataHoraAgendamentoInicio, 
      tipo: 'Manutenção',
      categoria: item.tipo, 
      titulo: `OS: ${item.numeroOS}`,
      descricao: item.descricaoProblemaServico,
      responsavel: item.tecnicoResponsavel || 'N/A',
      status: item.status,
      isOS: true,
      anexos: item.anexos || []
    }));

    // 2. Mapeia Ocorrências
    const o = (historicoBruto.ocorrencias || []).map(item => ({
      uniqueId: `oc-${item.id}`,
      data: item.dataResolucao || item.data, 
      tipo: 'Ocorrência',
      categoria: 'Evento / Ocorrência',
      titulo: item.titulo,
      descricao: item.descricao,
      responsavel: item.tecnicoResolucao || item.tecnico || 'N/A',
      status: item.resolvido ? 'Resolvido' : 'Pendente',
      isOS: false,
      solucao: item.solucao
    }));

    // 3. Unifica e ordena por data decrescente (mais recente primeiro)
    let unificado = [...m, ...o].sort((a, b) => new Date(b.data) - new Date(a.data));
    const contagemTotal = unificado.length;

    // 4. Aplica filtros de data se existirem
    if (dataInicio) {
        unificado = unificado.filter(item => new Date(item.data) >= new Date(dataInicio + 'T00:00:00'));
    }
    if (dataFim) {
        unificado = unificado.filter(item => new Date(item.data) <= new Date(dataFim + 'T23:59:59'));
    }

    // 5. LÓGICA DE LIMITE: Se NÃO houver filtro de data, limita aos 20 primeiros
    const exibirApenas20 = !dataInicio && !dataFim;
    const final = exibirApenas20 ? unificado.slice(0, 20) : unificado;

    return { linhaDoTempo: final, totalDisponivel: contagemTotal };
  }, [historicoBruto, dataInicio, dataFim]);

  const handleSetHoje = (campo) => {
    const hoje = new Date().toISOString().split('T')[0];
    if (campo === 'inicio') setDataInicio(hoje);
    if (campo === 'fim') setDataFim(hoje);
  };

  const handleExportar = () => {
    if (linhaDoTempo.length === 0) return addToast('Sem dados para o período.', 'info');
    exportarHistoricoEquipamentoPDF(linhaDoTempo, {
        modelo: equipamento.modelo, tag: equipamento.tag, unidade: equipamento.unidade?.nomeSistema,
        inicio: dataInicio, fim: dataFim
    });
  };

  return (
    <div className="unified-history-wrapper">
      <div className="tab-header-action flex flex-col gap-4 mb-6">
        <h3 className="tab-inner-title text-slate-800 font-bold flex items-center gap-2 m-0">
          <FontAwesomeIcon icon={faHistory} /> AUDITORIA DO ATIVO
        </h3>
        
        {/* BARRA DE FILTRO CLEAN */}
        <div className="audit-filter-bar bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4 w-full">
            <div className="filter-group flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Data Inicial</label>
                <div className="flex gap-1">
                    <DateInput value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-sm p-1.5 rounded border border-slate-300" />
                    <button className="bg-slate-200 text-slate-600 px-2 rounded hover:bg-slate-300 transition-colors border-none cursor-pointer font-bold" onClick={() => handleSetHoje('inicio')}>H</button>
                </div>
            </div>

            <div className="filter-group flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Data Final</label>
                <div className="flex gap-1">
                    <DateInput value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-sm p-1.5 rounded border border-slate-300" />
                    <button className="bg-slate-200 text-slate-600 px-2 rounded hover:bg-slate-300 transition-colors border-none cursor-pointer font-bold" onClick={() => handleSetHoje('fim')}>H</button>
                </div>
            </div>

            <div className="flex gap-3 items-center ml-auto">
                <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all border-none cursor-pointer flex items-center gap-2" onClick={handleExportar}>
                    <FontAwesomeIcon icon={faFilePdf} /> Gerar PDF
                </button>
                {(dataInicio || dataFim) && (
                    <button className="text-slate-400 hover:text-slate-600 text-xs font-bold underline bg-transparent border-none cursor-pointer" onClick={() => { setDataInicio(''); setDataFim(''); }}>Limpar</button>
                )}
            </div>
        </div>

        {/* AVISO DE LISTA LIMITADA (Aparece se não houver filtro e tiver mais de 20 itens) */}
        {!dataInicio && !dataFim && totalDisponivel > 20 && (
            <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl border border-amber-200 text-xs flex items-center gap-3 animate-pulse">
                <FontAwesomeIcon icon={faFilter} className="text-amber-500 text-sm" />
                <span>Exibindo os <strong>20 registros mais recentes</strong> de um total de {totalDisponivel}. Use o filtro acima para consultar o histórico completo de 10 anos.</span>
            </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>
      ) : (
        <div className="timeline-cards-list flex flex-col gap-3">
          {linhaDoTempo.length === 0 ? (
              <p className="no-data-message text-center py-10 text-slate-400 italic">Nenhum registro encontrado para este período.</p>
          ) : (
            linhaDoTempo.map((item) => {
                const expandido = itensExpandidos.has(item.uniqueId);
                const isPendente = !item.isOS && item.status === 'Pendente';

                return (
                <div key={item.uniqueId} className={`history-card-new bg-white border-y border-r border-slate-200 border-l-[6px] ${item.isOS ? 'border-l-blue-500' : (isPendente ? 'border-l-red-500' : 'border-l-emerald-500')} rounded-xl overflow-hidden transition-all shadow-sm`}>
                    <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => toggleExpandir(item.uniqueId)}>
                    <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-inner ${item.isOS ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-500'}`}>
                            <FontAwesomeIcon icon={item.isOS ? faWrench : faHistory} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{formatarDataHora(item.data)}</span>
                            <h4 className="m-0 text-sm font-bold text-slate-800 flex items-center gap-2">
                                {item.titulo}
                                {/* BOTÃO DE LINK DIRETO PARA A OS */}
                                {item.isOS && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); navigate(`/manutencoes/detalhes/${item.idOriginal}`); }}
                                        className="ml-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white px-2 py-0.5 rounded text-[10px] font-black transition-all border-none cursor-pointer flex items-center gap-1"
                                    >
                                        VER OS <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                                    </button>
                                )}
                            </h4>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-slate-100 ${item.isOS ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>{item.categoria}</span>
                        <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} className="text-slate-300 text-xs" />
                    </div>
                    </div>
                    
                    {expandido && (
                        <div className="p-5 bg-white border-t border-slate-100 animate-fadeIn">
                            <div className="content-section space-y-2">
                                <p className="text-sm text-slate-600"><strong><FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-slate-400" />Detalhes:</strong> {item.descricao || 'Sem detalhes informados.'}</p>
                                <p className="text-sm text-slate-600"><strong><FontAwesomeIcon icon={faUser} className="mr-2 text-slate-400" />Responsável:</strong> {item.responsavel}</p>
                                
                                {item.solucao && (
                                    <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="m-0 text-sm text-emerald-700 font-bold"><FontAwesomeIcon icon={faCheckCircle} className="mr-2" />Solução Técnica:</p>
                                        <p className="m-0 mt-1 text-sm text-emerald-600 leading-relaxed">{item.solucao}</p>
                                    </div>
                                )}

                                {item.isOS && item.anexos?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Documentos da OS:</h5>
                                        <div className="flex flex-col gap-2">
                                            {item.anexos.map(file => (
                                                <a key={file.id} href={`${API_BASE_URL}/${file.path}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 font-bold no-underline hover:underline">
                                                    <FontAwesomeIcon icon={faFileDownload} /> {file.nomeOriginal}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default TabHistorico;