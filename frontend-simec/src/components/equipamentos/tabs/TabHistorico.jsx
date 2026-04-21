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
  exportHistoricoAtivoByEquipamento,
  getHistoricoAtivoByEquipamento,
} from '@/services/api';

import { useToast } from '@/contexts/ToastContext';
import { exportarHistoricoEquipamentoPDF } from '@/utils/pdfUtils';
import {
  buildHistoricoTimeline,
  mapFiltroHistoricoParaQuery,
} from '@/utils/equipamentos/historicoTimelineUtils';

import HistoricoTimelineList from '@/components/equipamentos/HistoricoTimelineList';

import {
  Button,
  Card,
  DateInput,
  EmptyState,
  LoadingState,
  PageSection,
  Select,
  StatusBadge,
} from '@/components/ui';

function TabHistorico({ equipamento }) {
  const { addToast } = useToast();

  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offsetAtual, setOffsetAtual] = useState(0);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  const buildQueryParams = useCallback(
    ({ offset = 0, limit = 20 } = {}) => ({
      limit,
      offset,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      ...mapFiltroHistoricoParaQuery(filtroTipo),
    }),
    [dataInicio, dataFim, filtroTipo]
  );

  const carregarDados = useCallback(async () => {
    if (!equipamento?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const resposta = await getHistoricoAtivoByEquipamento(
        equipamento.id,
        buildQueryParams({ offset: 0, limit: 20 })
      );

      setEventos(Array.isArray(resposta?.items) ? resposta.items : []);
      setTotalRegistros(Number(resposta?.total || 0));
      setHasMore(Boolean(resposta?.hasMore));
      setOffsetAtual(Number(resposta?.nextOffset || 0));
    } catch {
      addToast('Erro ao carregar historico.', 'error');
      setEventos([]);
      setTotalRegistros(0);
      setHasMore(false);
      setOffsetAtual(0);
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id, addToast, buildQueryParams]);

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

  const { linhaDoTempo, totalFiltrado } =
    useMemo(
      () =>
        buildHistoricoTimeline({
          eventos,
        }),
      [eventos]
    );

  const temFiltroAtivo = Boolean(
    dataInicio || dataFim || filtroTipo !== 'Todos'
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
    exportHistoricoAtivoByEquipamento(equipamento.id, buildQueryParams({}))
      .then((lista) => {
        const timelineCompleta = buildHistoricoTimeline({
          eventos: Array.isArray(lista) ? lista : [],
        });

        exportarHistoricoEquipamentoPDF(timelineCompleta.linhaDoTempo, {
          modelo: equipamento?.modelo,
          tag: equipamento?.tag,
          unidade: equipamento?.unidade?.nomeSistema,
          inicio: dataInicio,
          fim: dataFim,
          tipoFiltro: filtroTipo,
        });
      })
      .catch(() => {
        addToast('Erro ao exportar historico completo.', 'error');
      });
  };

  const handleCarregarMais = async () => {
    if (!hasMore || carregandoMais) return;

    setCarregandoMais(true);

    try {
      const resposta = await getHistoricoAtivoByEquipamento(
        equipamento.id,
        buildQueryParams({ offset: offsetAtual, limit: 20 })
      );

      setEventos((prev) => [
        ...prev,
        ...(Array.isArray(resposta?.items) ? resposta.items : []),
      ]);
      setHasMore(Boolean(resposta?.hasMore));
      setOffsetAtual(Number(resposta?.nextOffset || offsetAtual));
      setTotalRegistros(Number(resposta?.total || totalRegistros));
    } catch {
      addToast('Erro ao carregar mais registros do historico.', 'error');
    } finally {
      setCarregandoMais(false);
    }
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

          {!temFiltroAtivo && totalRegistros > 20 ? (
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
                total de <strong>{` ${totalRegistros}`}</strong>. Use os filtros
                para visualizar todo o historico.
              </div>
            </div>
          ) : null}
        </Card>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_320px]">
          <div>
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
          </div>

          <div className="space-y-4">
            <Card surface="soft" className="rounded-2xl">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Contexto do ativo
              </span>

              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Modelo</div>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {equipamento?.modelo || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Tag</div>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {equipamento?.tag || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Unidade</div>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {equipamento?.unidade?.nomeSistema || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Status atual</div>
                  <div className="mt-1">
                    <StatusBadge value={equipamento?.status || 'N/A'} />
                  </div>
                </div>
              </div>
            </Card>

            <Card surface="soft" className="rounded-2xl">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Resumo filtrado
              </span>

              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-muted)' }}>Registros exibidos</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {linhaDoTempo.length}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-muted)' }}>Total encontrado</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {totalRegistros || totalFiltrado}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-muted)' }}>Filtro de tipo</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {filtroTipo === 'Todos' ? 'Todos' : filtroTipo}
                  </strong>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {!loading && linhaDoTempo.length > 0 ? (
          <div className="space-y-3">
            <div
              className="text-right text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Exibindo <strong>{linhaDoTempo.length}</strong> de{' '}
              <strong>{totalRegistros || totalFiltrado}</strong> registro(s) filtrado(s).
            </div>

            {hasMore ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCarregarMais}
                  disabled={carregandoMais}
                >
                  {carregandoMais ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}

export default TabHistorico;
