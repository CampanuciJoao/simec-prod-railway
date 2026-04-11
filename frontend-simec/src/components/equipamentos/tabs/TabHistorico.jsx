import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getManutencoes,
  getOcorrenciasPorEquipamento,
} from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { formatarDataHora } from '../../../utils/timeUtils';
import { exportarHistoricoEquipamentoPDF } from '../../../utils/pdfUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory,
  faSpinner,
  faFilePdf,
  faChevronDown,
  faChevronUp,
  faWrench,
  faFileDownload,
  faExternalLinkAlt,
  faFilter,
  faPaperclip,
  faCalendarDay,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import DateInput from '../../ui/DateInput';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function TabHistorico({ equipamento }) {
  const { addToast } = useToast();

  const [historicoBruto, setHistoricoBruto] = useState({
    manutencoes: [],
    ocorrencias: [],
  });
  const [loading, setLoading] = useState(true);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  const carregarDados = useCallback(async () => {
    if (!equipamento?.id) return;

    setLoading(true);

    try {
      const [manuts, ocorrs] = await Promise.all([
        getManutencoes({ equipamentoId: equipamento.id }),
        getOcorrenciasPorEquipamento(equipamento.id),
      ]);

      setHistoricoBruto({
        manutencoes: manuts || [],
        ocorrencias: ocorrs || [],
      });
    } catch (error) {
      addToast('Erro ao carregar histórico.', 'error');
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id, addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleExpandir = (id) => {
    setItensExpandidos((prev) => {
      const novos = new Set(prev);
      if (novos.has(id)) {
        novos.delete(id);
      } else {
        novos.add(id);
      }
      return novos;
    });
  };

  const { linhaDoTempo, totalFiltrado, totalSemFiltro, temFiltroAtivo } =
    useMemo(() => {
      const manutencoes = (historicoBruto.manutencoes || []).map((item) => ({
        uniqueId: `os-${item.id}`,
        idOriginal: item.id,
        data: item.dataConclusao || item.dataHoraAgendamentoInicio,
        tipo: 'Manutenção',
        categoria: item.tipo,
        titulo: `OS: ${item.numeroOS}`,
        chamado: item.numeroChamado,
        descricao: item.descricaoProblemaServico,
        responsavel: item.tecnicoResponsavel || 'N/A',
        status: item.status,
        isOS: true,
        anexos: item.anexos || [],
      }));

      const ocorrencias = (historicoBruto.ocorrencias || []).map((item) => ({
        uniqueId: `oc-${item.id}`,
        idOriginal: item.id,
        data: item.dataResolucao || item.data,
        tipo: 'Ocorrência',
        categoria: 'Evento',
        titulo: item.titulo,
        chamado: null,
        descricao: item.descricao,
        responsavel: item.tecnicoResolucao || item.tecnico || 'N/A',
        status: item.resolvido ? 'Resolvido' : 'Pendente',
        isOS: false,
        solucao: item.solucao,
      }));

      let unificado = [...manutencoes, ...ocorrencias];
      const contagemBruta = unificado.length;

      if (filtroTipo !== 'Todos') {
        if (filtroTipo === 'Evento') {
          unificado = unificado.filter((item) => !item.isOS);
        } else {
          unificado = unificado.filter((item) => item.categoria === filtroTipo);
        }
      }

      if (dataInicio) {
        unificado = unificado.filter(
          (item) => new Date(item.data) >= new Date(`${dataInicio}T00:00:00`)
        );
      }

      if (dataFim) {
        unificado = unificado.filter(
          (item) => new Date(item.data) <= new Date(`${dataFim}T23:59:59`)
        );
      }

      unificado.sort((a, b) => new Date(b.data) - new Date(a.data));

      const existeFiltro = Boolean(
        dataInicio || dataFim || filtroTipo !== 'Todos'
      );

      const final = !existeFiltro ? unificado.slice(0, 20) : unificado;

      return {
        linhaDoTempo: final,
        totalFiltrado: unificado.length,
        totalSemFiltro: contagemBruta,
        temFiltroAtivo: existeFiltro,
      };
    }, [historicoBruto, dataInicio, dataFim, filtroTipo]);

  const handleSetHoje = (campo) => {
    const hoje = new Date().toISOString().split('T')[0];
    if (campo === 'inicio') setDataInicio(hoje);
    if (campo === 'fim') setDataFim(hoje);
  };

  const handleLimparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setFiltroTipo('Todos');
  };

  const handleExportarPDF = () => {
    exportarHistoricoEquipamentoPDF(linhaDoTempo, {
      modelo: equipamento.modelo,
      tag: equipamento.tag,
      unidade: equipamento.unidade?.nomeSistema,
      inicio: dataInicio,
      fim: dataFim,
      tipoFiltro: filtroTipo,
    });
  };

  const getCategoriaBadgeClass = (item) => {
    if (item.isOS) {
      if (item.categoria === 'Corretiva') return 'badge badge-red';
      if (item.categoria === 'Preventiva') return 'badge badge-green';
      if (item.categoria === 'Calibracao') return 'badge badge-blue';
      if (item.categoria === 'Inspecao') return 'badge badge-yellow';
      return 'badge badge-slate';
    }

    if (item.status === 'Pendente') return 'badge badge-red';
    if (item.status === 'Resolvido') return 'badge badge-green';

    return 'badge badge-slate';
  };

  const getTimelineBorderClass = (item) => {
    if (item.isOS) {
      if (item.categoria === 'Corretiva') return 'border-l-red-500';
      if (item.categoria === 'Preventiva') return 'border-l-emerald-500';
      if (item.categoria === 'Calibracao') return 'border-l-blue-500';
      if (item.categoria === 'Inspecao') return 'border-l-amber-500';
      return 'border-l-slate-400';
    }

    return item.status === 'Pendente'
      ? 'border-l-red-500'
      : 'border-l-emerald-500';
  };

  const getTimelineIconClass = (item) => {
    if (item.isOS) {
      if (item.categoria === 'Corretiva') return 'bg-red-50 text-red-500';
      if (item.categoria === 'Preventiva')
        return 'bg-emerald-50 text-emerald-500';
      if (item.categoria === 'Calibracao') return 'bg-blue-50 text-blue-500';
      if (item.categoria === 'Inspecao') return 'bg-amber-50 text-amber-500';
      return 'bg-slate-50 text-slate-500';
    }

    return item.status === 'Pendente'
      ? 'bg-red-50 text-red-500'
      : 'bg-emerald-50 text-emerald-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <FontAwesomeIcon icon={faHistory} />
            </span>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Histórico do equipamento
              </h3>
              <p className="text-sm text-slate-500">
                Auditoria consolidada de manutenções e ocorrências
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleExportarPDF}
            disabled={linhaDoTempo.length === 0}
          >
            <FontAwesomeIcon icon={faFilePdf} />
            <span>Exportar PDF filtrado</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Tipo de registro
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="select"
              >
                <option value="Todos">Todos os registros</option>
                <option value="Preventiva">Apenas preventivas</option>
                <option value="Corretiva">Apenas corretivas</option>
                <option value="Evento">Apenas ocorrências</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Início
              </label>
              <div className="flex gap-2">
                <DateInput
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="input"
                />
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  onClick={() => handleSetHoje('inicio')}
                  title="Definir hoje"
                >
                  <FontAwesomeIcon icon={faCalendarDay} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Fim
              </label>
              <div className="flex gap-2">
                <DateInput
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="input"
                />
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  onClick={() => handleSetHoje('fim')}
                  title="Definir hoje"
                >
                  <FontAwesomeIcon icon={faCalendarDay} />
                </button>
              </div>
            </div>

            <div className="flex items-end justify-end">
              {temFiltroAtivo && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLimparFiltros}
                >
                  <FontAwesomeIcon icon={faRotateLeft} />
                  <span>Limpar filtros</span>
                </button>
              )}
            </div>
          </div>

          {!temFiltroAtivo && totalSemFiltro > 20 && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <FontAwesomeIcon icon={faFilter} className="mt-0.5 text-blue-400" />
              <span>
                Visualizando os 20 registros mais recentes de {totalSemFiltro}.
                Use os filtros para ver o histórico completo.
              </span>
            </div>
          )}

          <div className="mt-4 text-sm text-slate-500">
            Exibindo <span className="font-semibold text-slate-700">{linhaDoTempo.length}</span>{' '}
            de{' '}
            <span className="font-semibold text-slate-700">
              {temFiltroAtivo ? totalFiltrado : totalSemFiltro}
            </span>{' '}
            registro(s).
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            size="2x"
            className="text-slate-400"
          />
        </div>
      ) : linhaDoTempo.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Nenhum registro encontrado para os filtros aplicados.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {linhaDoTempo.map((item) => {
            const expandido = itensExpandidos.has(item.uniqueId);

            return (
              <div
                key={item.uniqueId}
                className={[
                  'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md',
                  'border-l-[6px]',
                  getTimelineBorderClass(item),
                ].join(' ')}
              >
                <div
                  className="flex cursor-pointer flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between hover:bg-slate-50"
                  onClick={() => toggleExpandir(item.uniqueId)}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div
                      className={[
                        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-inner',
                        getTimelineIconClass(item),
                      ].join(' ')}
                    >
                      <FontAwesomeIcon icon={item.isOS ? faWrench : faHistory} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {formatarDataHora(item.data)}
                      </span>

                      <h4 className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-tight text-slate-800 md:text-[15px]">
                        <span>{item.titulo}</span>

                        {item.isOS && item.chamado && (
                          <span className="text-xs font-semibold normal-case text-slate-500">
                            (chamado:{' '}
                            <span className="font-bold text-slate-700">
                              {item.chamado}
                            </span>
                            )
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {item.isOS && (
                      <Link
                        to={`/manutencoes/detalhes/${item.idOriginal}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white no-underline transition hover:bg-blue-700"
                      >
                        <span>Ver detalhes</span>
                        <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                      </Link>
                    )}

                    <span className={getCategoriaBadgeClass(item)}>
                      {item.categoria}
                    </span>

                    <FontAwesomeIcon
                      icon={expandido ? faChevronUp : faChevronDown}
                      className="text-slate-400"
                    />
                  </div>
                </div>

                {expandido && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-5 md:p-6">
                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Descrição
                        </span>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {item.descricao || 'Sem detalhes informados.'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Responsável
                        </span>
                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {item.responsavel}
                        </p>
                      </div>

                      {item.solucao && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                            Solução técnica
                          </span>
                          <p className="mt-2 text-sm leading-6 font-medium text-emerald-800">
                            {item.solucao}
                          </p>
                        </div>
                      )}

                      {item.isOS && item.anexos?.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={faPaperclip}
                              className="text-slate-400"
                            />
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                              Documentos
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            {item.anexos.map((file) => (
                              <a
                                key={file.id}
                                href={`${API_BASE_URL}/${file.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-blue-600 no-underline transition hover:bg-slate-100 hover:underline"
                              >
                                <FontAwesomeIcon icon={faFileDownload} />
                                <span>{file.nomeOriginal}</span>
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
          })}
        </div>
      )}
    </div>
  );
}

export default TabHistorico;