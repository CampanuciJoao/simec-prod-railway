import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTableCells, faFilePdf, faXRay, faUsers, faGauge, faHospital } from '@fortawesome/free-solid-svg-icons';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { getGehcBIUtilizacao } from '@/services/api/gehcApi';
import { exportarUtilizacaoGehcPDF } from '@/services/api/pdfApi';
import { useBIPage } from '@/hooks/bi/useBIPage';
import { useBIDrawerData } from '@/hooks/bi/useBIDrawerData';
import { useBILayout, DEFAULT_BI_LAYOUT, BI_ROW_HEIGHT, BI_GRID_MARGIN } from '@/hooks/bi/useBILayout';
import { useAuth } from '@/contexts/AuthContext';

import { PageLayout, PageSection, PageState, Button } from '@/components/ui';

import BIPageHeader from '@/components/bi/BIPageHeader';
import BIResumoCardsSection from '@/components/bi/BIResumoCardsSection';
import BIWidgetShell from '@/components/bi/BIWidgetShell';
import BIDowntimeChartWidget from '@/components/bi/BIDowntimeChartWidget';
import BIFrequenciaFalhasWidget from '@/components/bi/BIFrequenciaFalhasWidget';
import BIRankingDowntimeWidget from '@/components/bi/BIRankingDowntimeWidget';
import BIDetalhesDrawer from '@/components/bi/BIDetalhesDrawer';

const ResponsiveGrid = WidthProvider(Responsive);

function BIPage() {
  const page = useBIPage();
  const { usuario } = useAuth();

  const unidadeCriticaId = page.rankingUnidades[0]?.unidadeId || null;
  const drawerData = useBIDrawerData({
    type: page.drawer.type,
    open: page.drawer.open,
    unidadeCriticaId,
  });

  const { layout, onLayoutChange, resetLayout } = useBILayout(usuario?.id);
  const [expandedWidget, setExpandedWidget] = useState(null);

  const [gehcUtilizacao, setGehcUtilizacao] = useState(null);
  const [gehcLoading, setGehcLoading] = useState(false);
  const [gehcExportando, setGehcExportando] = useState(false);
  const gehcAbortRef = useRef(null);

  useEffect(() => {
    gehcAbortRef.current?.abort();
    gehcAbortRef.current = new AbortController();
    const { signal } = gehcAbortRef.current;
    setGehcLoading(true);
    getGehcBIUtilizacao(12, { signal })
      .then((data) => { if (!signal.aborted) setGehcUtilizacao(data); })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        if (err?.response?.status !== 404 && err?.response?.data?.code !== 'GEHC_NOT_CONFIGURED') {
          console.warn('[GEHC_BI]', err?.response?.data?.error ?? err.message);
        }
      })
      .finally(() => { if (!signal.aborted) setGehcLoading(false); });
    return () => gehcAbortRef.current?.abort();
  }, []);

  const handleExportarGehcPDF = async () => {
    setGehcExportando(true);
    try {
      await exportarUtilizacaoGehcPDF(12);
    } catch (e) {
      console.error('[GEHC_PDF_EXPORT]', e);
    } finally {
      setGehcExportando(false);
    }
  };

  const hasResumoCards = !!page.resumoCards && typeof page.resumoCards === 'object';

  const isEmpty =
    !page.loading &&
    !page.error &&
    (!page.dados ||
      (!page.rankingDowntime.length &&
        !page.rankingFrequencia.length &&
        !page.downtimePorUnidadeChartData.length));

  const shouldShowState = page.loading || Boolean(page.error) || isEmpty;

  // Quando um widget está expandido, força w=12 e x=0 nele
  const computedLayout = useMemo(() => {
    if (!expandedWidget) return layout;
    return layout.map((item) =>
      item.i === expandedWidget ? { ...item, w: 12, x: 0 } : item
    );
  }, [layout, expandedWidget]);

  const widgetMap = useMemo(
    () => ({
      downtime: {
        id: 'downtime',
        title: 'Downtime por unidade',
        description: 'Tempo acumulado de indisponibilidade por unidade no período analisado.',
        render: (expanded) => (
          <BIDowntimeChartWidget
            data={page.downtimePorUnidadeChartData}
            expanded={expanded}
          />
        ),
      },
      frequencia: {
        id: 'frequencia',
        title: 'Reincidência de falhas',
        description: 'Equipamentos com maior volume de corretivas concluídas no período.',
        render: () => (
          <BIFrequenciaFalhasWidget
            items={page.rankingFrequencia}
            onSelectEquipamento={page.handleDrillDownEquipamento}
          />
        ),
      },
      ranking: {
        id: 'ranking',
        title: 'Ranking de downtime',
        description: 'Equipamentos com maior tempo parado, já considerando a duração efetiva da OS.',
        render: (expanded) => (
          <BIRankingDowntimeWidget
            items={page.rankingDowntime}
            expanded={expanded}
          />
        ),
      },
    }),
    [page]
  );

  const toggleExpand = (widgetId) => {
    setExpandedWidget((prev) => (prev === widgetId ? null : widgetId));
  };

  const handleLayoutChange = (_current, allLayouts) => {
    // Só persiste o layout quando nenhum widget está expandido
    if (!expandedWidget) {
      onLayoutChange(allLayouts.lg || layout);
    }
  };

  return (
    <>
      <PageLayout background="slate" padded fullHeight>
        <div className="space-y-6">
          <BIPageHeader
            ano={page.dados?.ano}
            onPrint={page.handlePrint}
            onRefresh={page.recarregar}
            canPrint={!!page.dados}
            canRefresh={!page.loading}
          />

          {hasResumoCards ? (
            <BIResumoCardsSection
              resumoCards={page.resumoCards}
              onOpenDrawer={page.openDrawer}
            />
          ) : null}

          {(gehcLoading || gehcUtilizacao) && (
            <PageSection
              title="Utilização GE Healthcare"
              description={
                gehcUtilizacao
                  ? `Exames e disponibilidade dos equipamentos GE nos últimos ${gehcUtilizacao.periodo?.meses || 12} meses.`
                  : ''
              }
              darkHeader
              headerRight={
                gehcUtilizacao && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleExportarGehcPDF}
                    disabled={gehcExportando}
                  >
                    <FontAwesomeIcon icon={faFilePdf} className="mr-1" />
                    {gehcExportando ? 'Gerando...' : 'Exportar PDF'}
                  </Button>
                )
              }
            >
              {gehcLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Carregando dados GE Healthcare...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border-b border-gray-700">
                    {[
                      { icon: faXRay, label: 'Total de Exames', value: gehcUtilizacao.totais?.exames?.toLocaleString('pt-BR') ?? '—' },
                      { icon: faUsers, label: 'Total de Pacientes', value: gehcUtilizacao.totais?.pacientes?.toLocaleString('pt-BR') ?? '—' },
                      { icon: faGauge, label: 'Uptime Médio', value: gehcUtilizacao.totais?.uptimeMedio != null ? `${gehcUtilizacao.totais.uptimeMedio.toFixed(1)}%` : '—' },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                        <FontAwesomeIcon icon={icon} className="text-blue-400 text-xl w-6 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-lg font-semibold text-white">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="divide-y divide-gray-700/60">
                    {gehcUtilizacao.unidades?.map((unidade) => (
                      <div key={unidade.nome} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                            <FontAwesomeIcon icon={faHospital} className="text-blue-400" />
                            {unidade.nome}
                          </h3>
                          <div className="text-xs text-gray-400 flex gap-4">
                            <span>{unidade.totalExames?.toLocaleString('pt-BR')} exames</span>
                            <span>{unidade.totalPacientes?.toLocaleString('pt-BR')} pacientes</span>
                            {unidade.uptimeMedio != null && (
                              <span>Uptime {unidade.uptimeMedio.toFixed(1)}%</span>
                            )}
                          </div>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-700">
                              <th className="text-left py-1 pr-3 font-medium">Equipamento</th>
                              <th className="text-left py-1 pr-3 font-medium">Tag</th>
                              <th className="text-right py-1 pr-3 font-medium">Exames</th>
                              <th className="text-right py-1 pr-3 font-medium">Pacientes</th>
                              <th className="text-right py-1 pr-3 font-medium">Média/Dia</th>
                              <th className="text-right py-1 font-medium">Uptime</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unidade.equipamentos?.map((eq) => (
                              <tr
                                key={eq.tag || eq.nome}
                                className="text-gray-300 border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors"
                              >
                                <td className="py-1.5 pr-3">{eq.nome}</td>
                                <td className="py-1.5 pr-3 text-gray-400 font-mono">{eq.tag}</td>
                                <td className="py-1.5 pr-3 text-right">{eq.totalExames?.toLocaleString('pt-BR')}</td>
                                <td className="py-1.5 pr-3 text-right">{eq.totalPacientes?.toLocaleString('pt-BR')}</td>
                                <td className="py-1.5 pr-3 text-right">{eq.mediaExamesDia ?? '—'}</td>
                                <td className="py-1.5 text-right">
                                  {eq.uptimeMedio != null ? `${eq.uptimeMedio.toFixed(1)}%` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </PageSection>
          )}

          {shouldShowState ? (
            <PageSection
              title="Widgets analíticos"
              description="Os gráficos priorizam leitura executiva rápida, com foco em downtime, criticidade e recorrência operacional."
              darkHeader
            >
              <PageState
                loading={page.loading}
                error={page.error?.message || page.error || ''}
                isEmpty={isEmpty}
                emptyMessage="Dados de BI não disponíveis para o período selecionado."
              />
            </PageSection>
          ) : (
            <PageSection
              title="Widgets analíticos"
              description="Arraste os widgets para reorganizar. Redimensione pelas bordas."
              darkHeader
              headerRight={
                <Button type="button" variant="secondary" onClick={resetLayout} title="Redefinir layout padrão">
                  <FontAwesomeIcon icon={faTableCells} /> Redefinir layout
                </Button>
              }
            >
              <ResponsiveGrid
                layouts={{ lg: computedLayout, md: computedLayout, sm: computedLayout }}
                breakpoints={{ lg: 1100, md: 768, sm: 0 }}
                cols={{ lg: 12, md: 12, sm: 1 }}
                rowHeight={BI_ROW_HEIGHT}
                margin={BI_GRID_MARGIN}
                draggableHandle=".drag-handle"
                onLayoutChange={handleLayoutChange}
                resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n']}
                className="layout"
              >
                {Object.values(widgetMap).map((widget) => {
                  const isExpanded = expandedWidget === widget.id;
                  return (
                    <BIWidgetShell
                      key={widget.id}
                      title={widget.title}
                      description={widget.description}
                      expanded={isExpanded}
                      onToggleExpand={() => toggleExpand(widget.id)}
                    >
                      {widget.render(isExpanded)}
                    </BIWidgetShell>
                  );
                })}
              </ResponsiveGrid>
            </PageSection>
          )}
        </div>
      </PageLayout>

      <BIDetalhesDrawer
        open={page.drawer.open}
        onClose={page.closeDrawer}
        drawerType={page.drawer.type}
        resumoCards={page.resumoCards}
        rankingUnidades={page.rankingUnidades}
        rankingDowntime={page.rankingDowntime}
        liveItems={drawerData.items}
        liveLoading={drawerData.loading}
        liveHasMore={drawerData.hasMore}
        onLoadMore={drawerData.loadMore}
      />
    </>
  );
}

export default BIPage;
