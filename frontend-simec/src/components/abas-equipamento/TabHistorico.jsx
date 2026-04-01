// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO 4.0 - HISTÓRICO INTELIGENTE COM LIMITE E NAVEGAÇÃO DIRETA

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getManutencoes, getOcorrenciasPorEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { exportarHistoricoEquipamentoPDF } from '../../utils/pdfUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faSpinner, faFilePdf, faChevronDown, faChevronUp, 
  faCheckCircle, faExclamationTriangle, faInfoCircle, 
  faUser, faWrench, faFileDownload, faExternalLinkAlt, faFilter 
} from '@fortawesome/free-solid-svg-icons';
import DateInput from '../DateInput';

// URL base para anexos
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function TabHistorico({ equipamento }) {
  const navigate = useNavigate();
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

  // ==========================================================================
  // >>> LÓGICA DE PROCESSAMENTO: LIMITAÇÃO E FORMATAÇÃO <<<
  // ==========================================================================
  const { linhaDoTempo, totalGeral } = useMemo(() => {
    // 1. Processa Manutenções
    const m = (historicoBruto.manutencoes || []).map(item => ({
      uniqueId: `os-${item.id}`,
      idOriginal: item.id,
      data: item.dataConclusao || item.dataHoraAgendamentoInicio, 
      tipo: 'Manutenção',
      categoria: item.tipo, 
      titulo: `OS: ${item.numeroOS}`,
      chamado: item.numeroChamado, // Captura o número do chamado
      descricao: item.descricaoProblemaServico,
      responsavel: item.tecnicoResponsavel || 'N/A',
      status: item.status,
      isOS: true,
      anexos: item.anexos || []
    }));

    // 2. Processa Ocorrências
    const o = (historicoBruto.ocorrencias || []).map(item => ({
      uniqueId: `oc-${item.id}`,
      data: item.dataResolucao || item.data, 
      tipo: 'Ocorrência',
      categoria: 'Evento',
      titulo: item.titulo,
      descricao: item.descricao,
      responsavel: item.tecnicoResolucao || item.tecnico || 'N/A',
      status: item.resolvido ? 'Resolvido' : 'Pendente',
      isOS: false,
      solucao: item.solucao
    }));

    // 3. Unifica e ordena por data (mais recente primeiro)
    let unificado = [...m, ...o].sort((a, b) => new Date(b.data) - new Date(a.data));
    const contagemTotal = unificado.length;

    // 4. Aplica filtros de data manuais
    if (dataInicio) {
        unificado = unificado.filter(item => new Date(item.data) >= new Date(dataInicio + 'T00:00:00'));
    }
    if (dataFim) {
        unificado = unificado.filter(item => new Date(item.data) <= new Date(dataFim + 'T23:59:59'));
    }

    // 5. REGRA DOS 20 ÚLTIMOS: Se não houver filtro, corta a lista
    const exibirApenas20 = !dataInicio && !dataFim;
    const listaFinal = exibirApenas20 ? unificado.slice(0, 20) : unificado;

    return { linhaDoTempo: listaFinal, totalGeral: contagemTotal };
  }, [historicoBruto, dataInicio, dataFim]);

  const handleSetHoje = (campo) => {
    const hoje = new Date().toISOString().split('T')[0];
    if (campo === 'inicio') setDataInicio(hoje);
    if (campo === 'fim') setDataFim(hoje);
  };

  return (
    <div className="unified-history-wrapper">
      <div className="tab-header-action flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
            <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest flex items-center gap-2 m-0">
                <FontAwesomeIcon icon={faHistory} className="text-blue-500" /> AUDITORIA DO ATIVO
            </h3>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2" onClick={() => exportarHistoricoEquipamentoPDF(linhaDoTempo, { modelo: equipamento.modelo, tag: equipamento.tag, unidade: equipamento.unidade?.nomeSistema, inicio: dataInicio, fim: dataFim })}>
                <FontAwesomeIcon icon={faFilePdf} /> Exportar PDF
            </button>
        </div>
        
        {/* BARRA DE FILTROS CLEAN */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-6 w-full">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Período Inicial</label>
                <div className="flex gap-1">
                    <DateInput value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-sm p-1.5 rounded border border-slate-300 outline-none focus:border-blue-500" />
                    <button className="bg-slate-200 text-slate-600 px-2 rounded hover:bg-slate-300 border-none cursor-pointer font-bold" onClick={() => handleSetHoje('inicio')}>H</button>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Período Final</label>
                <div className="flex gap-1">
                    <DateInput value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-sm p-1.5 rounded border border-slate-300 outline-none focus:border-blue-500" />
                    <button className="bg-slate-200 text-slate-600 px-2 rounded hover:bg-slate-300 border-none cursor-pointer font-bold" onClick={() => handleSetHoje('fim')}>H</button>
                </div>
            </div>
            {(dataInicio || dataFim) && (
                <button className="text-slate-400 hover:text-red-500 text-xs font-bold underline bg-transparent border-none cursor-pointer mb-2" onClick={() => { setDataInicio(''); setDataFim(''); }}>Limpar Filtros</button>
            )}
        </div>

        {/* AVISO DE LISTA LIMITADA */}
        {!dataInicio && !dataFim && totalGeral > 20 && (
            <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 text-xs flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faFilter} className="text-blue-400" />
                    <span>Exibindo os <strong>20 registros mais recentes</strong> de um total de {totalGeral}.</span>
                </div>
                <span className="font-bold text-[10px] uppercase opacity-70 italic tracking-wider">Histórico Completo disponível via filtro</span>
            </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>
      ) : (
        <div className="timeline-cards-list flex flex-col gap-3">
          {linhaDoTempo.map((item) => {
                const expandido = itensExpandidos.has(item.uniqueId);
                const isPendente = !item.isOS && item.status === 'Pendente';

                return (
                <div key={item.uniqueId} className={`bg-white border-y border-r border-slate-200 border-l-[6px] ${item.isOS ? 'border-l-blue-500' : (isPendente ? 'border-l-red-500' : 'border-l-emerald-500')} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all`}>
                    <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleExpandir(item.uniqueId)}>
                        <div className="flex items-center gap-5 flex-1">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs shadow-inner ${item.isOS ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-500'}`}>
                                <FontAwesomeIcon icon={item.isOS ? faWrench : faHistory} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase mb-0.5">{formatarDataHora(item.data)}</span>
                                <h4 className="m-0 text-[15px] font-black text-slate-800 flex items-center uppercase tracking-tight">
                                    {item.titulo}
                                    {/* EXIBIÇÃO DO CHAMADO AO LADO DA OS */}
                                    {item.isOS && item.chamado && (
                                        <span className="ml-2 text-slate-400 font-bold text-xs lowercase">
                                            (chamado: <span className="text-slate-600 font-black">{item.chamado}</span>)
                                        </span>
                                    )}
                                </h4>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* BOTÃO "VER OS" REPOSICIONADO NA DIREITA */}
                            {item.isOS && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); navigate(`/manutencoes/detalhes/${item.idOriginal}`); }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border-none cursor-pointer flex items-center gap-2 shadow-sm"
                                >
                                    VER DETALHES <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                                </button>
                            )}
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${item.isOS ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{item.categoria}</span>
                            <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} className="text-slate-300 text-xs" />
                        </div>
                    </div>
                    
                    {expandido && (
                        <div className="p-6 bg-slate-50/30 border-t border-slate-100 animate-fadeIn">
                            <div className="space-y-3">
                                <p className="text-sm text-slate-700 m-0"><strong className="text-slate-400 uppercase text-[10px] block mb-1">Descrição do Serviço:</strong> {item.descricao || 'Sem detalhes informados.'}</p>
                                <p className="text-sm text-slate-700 m-0"><strong className="text-slate-400 uppercase text-[10px] block mb-1">Responsável Técnico:</strong> {item.responsavel}</p>
                                {item.solucao && (
                                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="m-0 text-[10px] text-emerald-700 font-black uppercase tracking-widest mb-1">Solução Técnica:</p>
                                        <p className="m-0 text-sm text-emerald-800 leading-relaxed font-medium">{item.solucao}</p>
                                    </div>
                                )}
                                {item.isOS && item.anexos?.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-slate-200">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Documentos Anexados:</h5>
                                        <div className="flex flex-col gap-2">
                                            {item.anexos.map(file => (
                                                <a key={file.id} href={`${API_BASE_URL}/${file.path}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 font-bold no-underline hover:underline bg-white p-2 rounded border border-slate-100 shadow-xs w-fit">
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
          }
        </div>
      )}
    </div>
  );
}

export default TabHistorico;