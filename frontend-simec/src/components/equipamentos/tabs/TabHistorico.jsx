// Ficheiro: src/components/abas-equipamento/TabHistorico.jsx
// VERSÃO 6.0 - HISTÓRICO COM LINKS REAIS, CHAMADO NO TÍTULO E PDF DINÂMICO

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // <<< IMPORTADO 'Link' PARA NOVAS ABAS
import { getManutencoes, getOcorrenciasPorEquipamento } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { formatarDataHora } from '../../../utils/timeUtils';
import { exportarHistoricoEquipamentoPDF } from '../../../utils/pdfUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faSpinner, faFilePdf, faChevronDown, faChevronUp, 
  faCheckCircle, faExclamationTriangle, faInfoCircle, 
  faUser, faWrench, faFileDownload, faExternalLinkAlt, faFilter 
} from '@fortawesome/free-solid-svg-icons';
import DateInput from '../../DateInput';

// URL base para arquivos
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function TabHistorico({ equipamento }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [historicoBruto, setHistoricoBruto] = useState({ manutencoes: [], ocorrencias: [] });
  const [loading, setLoading] = useState(true);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  
  // --- ESTADOS DOS FILTROS ---
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');

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
  // >>> LÓGICA DE PROCESSAMENTO DINÂMICO (FILTRO + PDF + LIMITE) <<<
  // ==========================================================================
  const { linhaDoTempo, totalFiltrado, totalSemFiltro } = useMemo(() => {
    // 1. Processa Manutenções (OS)
    const m = (historicoBruto.manutencoes || []).map(item => ({
      uniqueId: `os-${item.id}`,
      idOriginal: item.id,
      data: item.dataConclusao || item.dataHoraAgendamentoInicio, 
      tipo: 'Manutenção',
      categoria: item.tipo, 
      titulo: `OS: ${item.numeroOS}`,
      chamado: item.numeroChamado, // Capturado para o título
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

    let unificado = [...m, ...o];
    const contagemBruta = unificado.length;

    // 3. FILTRO POR TIPO
    if (filtroTipo !== 'Todos') {
        if (filtroTipo === 'Evento') unificado = unificado.filter(item => !item.isOS);
        else unificado = unificado.filter(item => item.categoria === filtroTipo);
    }

    // 4. FILTRO POR DATA
    if (dataInicio) unificado = unificado.filter(item => new Date(item.data) >= new Date(dataInicio + 'T00:00:00'));
    if (dataFim) unificado = unificado.filter(item => new Date(item.data) <= new Date(dataFim + 'T23:59:59'));

    // Ordenação mais recente primeiro
    unificado.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // 5. REGRA DOS 20 ÚLTIMOS: Só limita se NÃO houver nenhum filtro ativo
    const temFiltroAtivo = dataInicio || dataFim || filtroTipo !== 'Todos';
    const final = !temFiltroAtivo ? unificado.slice(0, 20) : unificado;

    return { linhaDoTempo: final, totalFiltrado: unificado.length, totalSemFiltro: contagemBruta };
  }, [historicoBruto, dataInicio, dataFim, filtroTipo]);

  const handleSetHoje = (campo) => {
    const hoje = new Date().toISOString().split('T')[0];
    if (campo === 'inicio') setDataInicio(hoje);
    if (campo === 'fim') setDataFim(hoje);
  };

  return (
    <div className="unified-history-wrapper">
      <div className="tab-header-action flex flex-col gap-4 mb-6">
        
        {/* CABEÇALHO: TÍTULO À ESQUERDA, PDF À DIREITA */}
        <div className="flex justify-between items-center w-full">
            <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest flex items-center gap-2 m-0">
                <FontAwesomeIcon icon={faHistory} className="text-blue-500" /> AUDITORIA DO ATIVO
            </h3>
            <button 
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-xs font-black shadow-md transition-all border-none cursor-pointer flex items-center gap-2 uppercase tracking-tighter" 
                onClick={() => exportarHistoricoEquipamentoPDF(linhaDoTempo, { modelo: equipamento.modelo, tag: equipamento.tag, unidade: equipamento.unidade?.nomeSistema, inicio: dataInicio, fim: dataFim, tipoFiltro: filtroTipo })}
                disabled={linhaDoTempo.length === 0}
            >
                <FontAwesomeIcon icon={faFilePdf} /> Exportar PDF Filtrado
            </button>
        </div>
        
        {/* BARRA DE FILTROS CLEAN */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 w-full items-end">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Tipo de Registro</label>
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="text-sm p-1.5 rounded border border-slate-300 outline-none focus:border-blue-500 bg-white cursor-pointer">
                    <option value="Todos">Todos os Registros</option>
                    <option value="Preventiva">Apenas Preventivas</option>
                    <option value="Corretiva">Apenas Corretivas</option>
                    <option value="Evento">Apenas Ocorrências</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Início</label>
                <div className="flex gap-1">
                    <DateInput value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="flex-1 text-sm p-1.5 rounded border border-slate-300" />
                    <button className="bg-slate-200 text-slate-600 px-2 rounded hover:bg-slate-300 border-none cursor-pointer font-bold" onClick={() => handleSetHoje('inicio')}>H</button>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Fim</label>
                <div className="flex gap-1">
                    <DateInput value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="flex-1 text-sm p-1.5 rounded border border-slate-300" />
                    <button className="bg-slate-200 text-slate-600 px-2 rounded hover:bg-slate-300 border-none cursor-pointer font-bold" onClick={() => handleSetHoje('fim')}>H</button>
                </div>
            </div>
            <div className="flex items-center justify-end h-full">
                {(dataInicio || dataFim || filtroTipo !== 'Todos') && (
                    <button className="text-slate-400 hover:text-red-500 text-xs font-bold underline bg-transparent border-none cursor-pointer mb-2" onClick={() => { setDataInicio(''); setDataFim(''); setFiltroTipo('Todos'); }}>Limpar Filtros</button>
                )}
            </div>
        </div>

        {/* AVISO DE LISTA LIMITADA */}
        {!dataInicio && !dataFim && filtroTipo === 'Todos' && totalSemFiltro > 20 && (
            <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 text-xs flex items-center gap-3">
                <FontAwesomeIcon icon={faFilter} className="text-blue-400" />
                <span>Visualizando os 20 registros mais recentes de {totalSemFiltro}. Use os filtros para ver o histórico completo.</span>
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
                    <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => toggleExpandir(item.uniqueId)}>
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
                            {/* >>> LINK REAL REPOSICIONADO À DIREITA (ABRE EM NOVA ABA) <<< */}
                            {item.isOS && (
                                <Link 
                                    to={`/manutencoes/detalhes/${item.idOriginal}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-all no-underline flex items-center gap-2 shadow-sm shrink-0"
                                >
                                    VER DETALHES <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                                </Link>
                            )}
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${item.isOS ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{item.categoria}</span>
                            <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} className="text-slate-300 text-xs shrink-0" />
                        </div>
                    </div>
                    
                    {expandido && (
                        <div className="p-6 bg-slate-50/30 border-t border-slate-100 animate-fadeIn">
                            <div className="space-y-3">
                                <p className="text-sm text-slate-700 m-0"><strong className="text-slate-400 uppercase text-[10px] block mb-1">Descrição:</strong> {item.descricao || 'Sem detalhes informados.'}</p>
                                <p className="text-sm text-slate-700 m-0"><strong className="text-slate-400 uppercase text-[10px] block mb-1">Responsável:</strong> {item.responsavel}</p>
                                {item.solucao && (
                                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="m-0 text-[10px] text-emerald-700 font-black uppercase tracking-widest mb-1">Solução Técnica:</p>
                                        <p className="m-0 text-sm text-emerald-800 leading-relaxed font-medium">{item.solucao}</p>
                                    </div>
                                )}
                                {item.isOS && item.anexos?.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-slate-200">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Documentos:</h5>
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