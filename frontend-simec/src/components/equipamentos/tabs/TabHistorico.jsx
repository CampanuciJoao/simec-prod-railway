import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory,
  faFilePdf,
  faFilter,
  faCalendarDay,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';

import {
  getManutencoes,
  getOcorrenciasPorEquipamento,
} from '@/services/api';

import { useToast } from '@/contexts/ToastContext';
import { exportarHistoricoEquipamentoPDF } from '@/utils/pdfUtils';
import { buildHistoricoTimeline } from '@/utils/equipamentos/historicoTimelineUtils';

import HistoricoTimelineList from '@/components/equipamentos/HistoricoTimelineList';

import {
  PageSection,
  Button,
  DateInput,
  LoadingState,
  EmptyState,
} from '@/components/ui';

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
    if (!equipamento?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [manuts, ocorrs] = await Promise.all([
        getManutencoes({ equipamentoId: equipamento.id }),
        getOcorrenciasPorEquipamento(equipamento.id),
      ]);

      setHistoricoBruto({
        manutencoes: Array.isArray(manuts) ? manuts : [],
        ocorrencias: Array.isArray(ocorrs) ? ocorrs : [],
      });
    } catch {
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
      return buildHistoricoTimeline({
        historicoBruto,
        dataInicio,
        dataFim,
        filtroTipo,
      });
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
      modelo: equipamento?.modelo,
      tag: equipamento?.tag,
      unidade: equipamento?.unidade?.nomeSistema,
      inicio: dataInicio,
      fim: dataFim,
      tipoFiltro: filtroTipo,
    });
  };

  return (
    <PageSection
      title="Histórico do equipamento"
      description="Auditoria consolidada de manutenções e ocorrências"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <FontAwesomeIcon icon={faHistory} />
        </span>

        <div>
          <p className="text-sm font-semibold text-slate-900">
            Linha do tempo operacional
          </p>
          <p className="text-sm text-slate-500">
            Consulte eventos, ordens de serviço e registros associados
          </p>
        </div>
      </div>

      <div className="mb-5 flex justify-end">
        <Button
          type="button"
          variant="danger"
          onClick={handleExportarPDF}
          disabled={linhaDoTempo.length === 0}
        >
          <FontAwesomeIcon icon={faFilePdf} />
          Exportar PDF filtrado
        </Button>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
            {temFiltroAtivo ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleLimparFiltros}
              >
                <FontAwesomeIcon icon={faRotateLeft} />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>

        {!temFiltroAtivo && totalSemFiltro > 20 ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <FontAwesomeIcon icon={faFilter} className="mt-0.5" />
            <div>
              Exibindo os <strong>20 registros mais recentes</strong> de um total
              de <strong> {totalSemFiltro}</strong>. Use os filtros para
              visualizar todo o histórico.
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <LoadingState message="Carregando histórico..." />
      ) : linhaDoTempo.length === 0 ? (
        <EmptyState message="Nenhum registro encontrado para os filtros selecionados." />
      ) : (
        <HistoricoTimelineList
          linhaDoTempo={linhaDoTempo}
          itensExpandidos={itensExpandidos}
          onToggleExpandir={toggleExpandir}
        />
      )}

      {!loading && linhaDoTempo.length > 0 ? (
        <div className="mt-4 text-right text-xs text-slate-500">
          Exibindo <strong>{linhaDoTempo.length}</strong> de{' '}
          <strong>{totalFiltrado}</strong> registro(s) filtrado(s).
        </div>
      ) : null}
    </PageSection>
  );
}

export default TabHistorico;