import React, { useMemo, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTableCells } from '@fortawesome/free-solid-svg-icons';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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

          {shouldShowState ? (
            <PageSection
              title="Widgets analíticos"
              description="Os gráficos priorizam leitura executiva rápida, com foco em downtime, criticidade e recorrência operacional."
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
