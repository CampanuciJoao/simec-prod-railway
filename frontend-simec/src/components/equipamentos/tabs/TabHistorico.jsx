import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory,
  faFilePdf,
  faFilter,
  faCalendarDay,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';

import { getHistoricoAtivoByEquipamento } from '@/services/api';

import { useToast } from '@/contexts/ToastContext';
import { exportarHistoricoEquipamentoPDF } from '@/utils/pdfUtils';
import { buildHistoricoTimeline } from '@/utils/equipamentos/historicoTimelineUtils';

import HistoricoTimelineList from '@/components/equipamentos/HistoricoTimelineList';

import {
  Button,
  Card,
  DateInput,
  EmptyState,
  LoadingState,
  PageSection,
  Select,
} from '@/components/ui';

function TabHistorico({ equipamento }) {
  const { addToast } = useToast();

  const [eventos, setEventos] = useState([]);
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
      const resposta = await getHistoricoAtivoByEquipamento(equipamento.id);
      setEventos(Array.isArray(resposta) ? resposta : []);
    } catch {
      addToast('Erro ao carregar historico.', 'error');
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id, addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleExpandir = (id) => {
    setItensExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { linhaDoTempo, totalFiltrado, totalSemFiltro, temFiltroAtivo } =
    useMemo(
      () =>
        buildHistoricoTimeline({
          eventos,
          dataInicio,
          dataFim,
          filtroTipo,
        }),
      [eventos, dataInicio, dataFim, filtroTipo]
    );

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
      title="Historico do equipamento"
      description="Historico unico do ativo com manutencoes, ocorrencias e mudancas relevantes."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <FontAwesomeIcon icon={faHistory} />
          </span>

          <div className="min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Linha do tempo do ativo
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Consulte a vida completa do ativo em uma unica linha do tempo.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
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

        <Card surface="soft" className="rounded-2xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select
              label="Tipo de registro"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="Todos">Todos os registros</option>
              <option value="Preventiva">Apenas preventivas</option>
              <option value="Corretiva">Apenas corretivas</option>
              <option value="Ocorrencia">Apenas ocorrencias</option>
              <option value="Transferencia">Transferencias</option>
              <option value="Alteracao">Alteracoes cadastrais</option>
              <option value="Instalacao">Instalacao inicial</option>
            </Select>

            <div className="flex gap-2">
              <div className="flex-1">
                <DateInput
                  label="Inicio"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3"
                  onClick={() => handleSetHoje('inicio')}
                  title="Definir hoje"
                >
                  <FontAwesomeIcon icon={faCalendarDay} />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <DateInput
                  label="Fim"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3"
                  onClick={() => handleSetHoje('fim')}
                  title="Definir hoje"
                >
                  <FontAwesomeIcon icon={faCalendarDay} />
                </Button>
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
            <div
              className="mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: 'var(--brand-primary-soft)',
                backgroundColor: 'var(--brand-primary-soft)',
                color: 'var(--text-primary)',
              }}
            >
              <FontAwesomeIcon
                icon={faFilter}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--brand-primary)' }}
              />

              <div>
                Exibindo os <strong>20 registros mais recentes</strong> de um
                total de <strong>{` ${totalSemFiltro}`}</strong>. Use os filtros
                para visualizar todo o historico.
              </div>
            </div>
          ) : null}
        </Card>

        {loading ? (
          <LoadingState message="Carregando historico..." />
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
          <div
            className="text-right text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Exibindo <strong>{linhaDoTempo.length}</strong> de{' '}
            <strong>{totalFiltrado}</strong> registro(s) filtrado(s).
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}

export default TabHistorico;
