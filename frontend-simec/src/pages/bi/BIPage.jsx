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
import { useToast } from '@/contexts/ToastContext';

import { PageLayout, PageSection, PageState, Button } from '@/components/ui';

import BIPageHeader from '@/components/bi/BIPageHeader';
import BIResumoCardsSection from '@/components/bi/BIResumoCardsSection';
import BIWidgetShell from '@/components/bi/BIWidgetShell';
import BIDowntimeChartWidget from '@/components/bi/BIDowntimeChartWidget';
import BIFrequenciaFalhasWidget from '@/components/bi/BIFrequenciaFalhasWidget';
import BIRankingDowntimeWidget from '@/components/bi/BIRankingDowntimeWidget';
import BIEvolucaoMensalWidget from '@/components/bi/BIEvolucaoMensalWidget';
import BIDetalhesDrawer from '@/components/bi/BIDetalhesDrawer';

const ResponsiveGrid = WidthProvider(Responsive);

function BIPage() {
  const page = useBIPage();
  const { usuario } = useAuth();
  const { addToast } = useToast();

  const unidadeCriticaId = page.rankingUnidades[0]?.unidadeId || null;
  const drawerData = useBIDrawerData({
    type: page.drawer.type,
    open: page.drawer.open,
    unidadeCriticaId,
  });

  const { layout, onLayoutChange, resetLayout } = useBILayout(usuario?.id);
  const [expandedWidget, setExpandedWidget] = useState(null);

  // Drag/resize só faz sentido em desktop. Em touch (mobile) o usuário
  // arrasta widgets ao tentar scrollar — desativa.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : true
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
      addToast('PDF gerado com sucesso.', 'success');
    } catch (e) {
      console.error('[GEHC_PDF_EXPORT]', e);
      addToast('Erro ao gerar o PDF. Tente novamente.', 'error');
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
      evolucao: {
        id: 'evolucao',
        title: 'Evolução mensal',
        description: 'Preventivas, corretivas e downtime (horas) mês a mês no ano corrente.',
        render: () => (
          <BIEvolucaoMensalWidget data={page.dados?.evolucaoMensal ?? []} />
        ),
      },
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
        description: 'Equipamentos com 2 ou mais ocorrências corretivas no período.',
        render: () => (
          <BIFrequenciaFalhasWidget
            items={page.dados?.reincidentes ?? page.rankingFrequencia}
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
      <PageLayout padded fullHeight>
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
                isDraggable={isDesktop}
                isResizable={isDesktop}
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
                <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Carregando dados GE Healthcare...
                </div>
              ) : (
                <>
                  {/* KPIs do topo — tokenizados, alinhados com o padrão do app */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4"
                    style={{ borderBottom: '1px solid var(--border-soft)' }}
                  >
                    {[
                      { icon: faXRay,  label: 'Total de Exames',    value: gehcUtilizacao.totais?.exames?.toLocaleString('pt-BR') ?? '—',
                        bg: 'var(--brand-primary-surface)', fg: 'var(--brand-primary)' },
                      { icon: faUsers, label: 'Total de Pacientes', value: gehcUtilizacao.totais?.pacientes?.toLocaleString('pt-BR') ?? '—',
                        bg: 'var(--color-info-surface)',    fg: 'var(--color-info)' },
                      { icon: faGauge, label: 'Uptime Médio',       value: gehcUtilizacao.totais?.uptimeMedio != null ? `${gehcUtilizacao.totais.uptimeMedio.toFixed(1)}%` : '—',
                        bg: 'var(--color-success-surface)', fg: 'var(--color-success)' },
                    ].map(({ icon, label, value, bg, fg }) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-xl p-3.5"
                        style={{ backgroundColor: bg, border: '1px solid var(--border-soft)' }}
                      >
                        <span
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: 'var(--bg-surface)', color: fg, border: '1px solid var(--border-soft)' }}
                        >
                          <FontAwesomeIcon icon={icon} />
                        </span>
                        <div className="min-w-0">
                          <p
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10.5,
                              fontWeight: 600,
                              letterSpacing: '0.14em',
                              textTransform: 'uppercase',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {label}
                          </p>
                          <p
                            className="stat-value mt-0.5"
                            style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.1 }}
                          >
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tabelas por unidade — colgroup com larguras fixas garante alinhamento entre todas */}
                  <div>
                    {gehcUtilizacao.unidades?.map((unidade, idx) => (
                      <div
                        key={`${unidade.nome}-${idx}`}
                        className="p-4"
                        style={{ borderTop: idx > 0 ? '1px solid var(--border-soft)' : 'none' }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <h3
                            className="flex items-center gap-2"
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            <FontAwesomeIcon icon={faHospital} style={{ color: 'var(--brand-primary)' }} />
                            {unidade.nome}
                          </h3>
                          <div
                            className="flex flex-wrap gap-x-4 gap-y-1"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <span>
                              <strong style={{ color: 'var(--text-primary)' }}>
                                {unidade.totalExames?.toLocaleString('pt-BR')}
                              </strong> exames
                            </span>
                            <span>
                              <strong style={{ color: 'var(--text-primary)' }}>
                                {unidade.totalPacientes?.toLocaleString('pt-BR')}
                              </strong> pacientes
                            </span>
                            {unidade.uptimeMedio != null && (
                              <span>
                                Uptime <strong style={{ color: 'var(--text-primary)' }}>
                                  {unidade.uptimeMedio.toFixed(1)}%
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <table className="responsive-table w-full" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                          <colgroup>
                            <col style={{ width: '28%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '13%' }} />
                          </colgroup>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
                              {['Equipamento', 'Tag', 'Exames', 'Pacientes', 'Média/Dia', 'Uptime'].map((h, i) => (
                                <th
                                  key={h}
                                  className="py-2 px-2"
                                  style={{
                                    textAlign: i >= 2 ? 'right' : 'left',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {unidade.equipamentos?.map((eq) => {
                              const semDados = !eq.totalExames && !eq.totalPacientes;
                              return (
                                <tr
                                  key={eq.tag || eq.nome}
                                  style={{ borderBottom: '1px solid var(--border-soft)' }}
                                >
                                  <td className="py-2 px-2 truncate"
                                    data-label="Equipamento"
                                    style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}
                                    title={eq.nome}
                                  >
                                    {eq.nome}
                                  </td>
                                  <td className="py-2 px-2 truncate"
                                    data-label="Tag"
                                    style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: 12,
                                      color: 'var(--text-muted)',
                                    }}
                                    title={eq.tag}
                                  >
                                    {eq.tag || '—'}
                                  </td>
                                  <td className="py-2 px-2 stat-value"
                                    data-label="Exames"
                                    style={{
                                      textAlign: 'right',
                                      fontSize: 13,
                                      color: semDados ? 'var(--text-muted)' : 'var(--text-primary)',
                                    }}
                                  >
                                    {eq.totalExames?.toLocaleString('pt-BR') ?? '—'}
                                  </td>
                                  <td className="py-2 px-2 stat-value"
                                    data-label="Pacientes"
                                    style={{
                                      textAlign: 'right',
                                      fontSize: 13,
                                      color: semDados ? 'var(--text-muted)' : 'var(--text-primary)',
                                    }}
                                  >
                                    {eq.totalPacientes?.toLocaleString('pt-BR') ?? '—'}
                                  </td>
                                  <td className="py-2 px-2 stat-value"
                                    data-label="Média/Dia"
                                    style={{
                                      textAlign: 'right',
                                      fontSize: 13,
                                      color: 'var(--text-secondary)',
                                    }}
                                  >
                                    {eq.mediaExamesDia ?? '—'}
                                  </td>
                                  <td className="py-2 px-2 stat-value"
                                    data-label="Uptime"
                                    style={{
                                      textAlign: 'right',
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: eq.uptimeMedio == null
                                        ? 'var(--text-muted)'
                                        : eq.uptimeMedio >= 99 ? 'var(--color-success)'
                                        : eq.uptimeMedio >= 95 ? 'var(--color-warning)'
                                        : 'var(--color-danger)',
                                    }}
                                  >
                                    {eq.uptimeMedio != null ? `${eq.uptimeMedio.toFixed(1)}%` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
