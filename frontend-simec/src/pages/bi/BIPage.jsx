import React, { useMemo, useState } from 'react';

import { useBIPage } from '@/hooks/bi/useBIPage';

import { PageLayout, PageSection, PageState } from '@/components/ui';

import BIPageHeader from '@/components/bi/BIPageHeader';
import BIResumoCardsSection from '@/components/bi/BIResumoCardsSection';
import BIWidgetShell from '@/components/bi/BIWidgetShell';
import BIDowntimeChartWidget from '@/components/bi/BIDowntimeChartWidget';
import BIFrequenciaFalhasWidget from '@/components/bi/BIFrequenciaFalhasWidget';
import BIRankingDowntimeWidget from '@/components/bi/BIRankingDowntimeWidget';
import BIDetalhesDrawer from '@/components/bi/BIDetalhesDrawer';

const INITIAL_WIDGET_ORDER = ['downtime', 'frequencia', 'ranking'];

function moverItem(lista, fromIndex, toIndex) {
  const novaLista = [...lista];
  const [item] = novaLista.splice(fromIndex, 1);
  novaLista.splice(toIndex, 0, item);
  return novaLista;
}

function BIPage() {
  const page = useBIPage();

  const [widgetOrder, setWidgetOrder] = useState(INITIAL_WIDGET_ORDER);
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

  const widgetMap = useMemo(
    () => ({
      downtime: {
        id: 'downtime',
        title: 'Downtime por unidade',
        description:
          'Tempo acumulado de indisponibilidade por unidade no período analisado.',
        defaultSpanClassName: 'xl:col-span-1',
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
        description:
          'Equipamentos com maior volume de corretivas concluídas no período.',
        defaultSpanClassName: 'xl:col-span-1',
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
        description:
          'Equipamentos com maior tempo parado, já considerando a duração efetiva da OS.',
        defaultSpanClassName: 'xl:col-span-2',
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

  const orderedWidgets = widgetOrder.map((id) => widgetMap[id]).filter(Boolean);

  const toggleExpand = (widgetId) => {
    setExpandedWidget((prev) => (prev === widgetId ? null : widgetId));
  };

  const moveWidgetUp = (widgetId) => {
    const index = widgetOrder.indexOf(widgetId);
    if (index <= 0) return;
    setWidgetOrder((prev) => moverItem(prev, index, index - 1));
  };

  const moveWidgetDown = (widgetId) => {
    const index = widgetOrder.indexOf(widgetId);
    if (index === -1 || index >= widgetOrder.length - 1) return;
    setWidgetOrder((prev) => moverItem(prev, index, index + 1));
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
              description="Os gráficos priorizam leitura executiva rápida, com foco em downtime, criticidade e recorrência operacional."
            >
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {orderedWidgets.map((widget, index) => {
                  const isExpanded = expandedWidget === widget.id;

                  const spanClassName = isExpanded
                    ? 'xl:col-span-2'
                    : widget.defaultSpanClassName;

                  return (
                    <div key={widget.id} className={spanClassName}>
                      <BIWidgetShell
                        title={widget.title}
                        description={widget.description}
                        expanded={isExpanded}
                        canMoveUp={index > 0}
                        canMoveDown={index < orderedWidgets.length - 1}
                        onToggleExpand={() => toggleExpand(widget.id)}
                        onMoveUp={() => moveWidgetUp(widget.id)}
                        onMoveDown={() => moveWidgetDown(widget.id)}
                      >
                        {widget.render(isExpanded)}
                      </BIWidgetShell>
                    </div>
                  );
                })}
              </div>
            </PageSection>
          )}
        </div>
      </PageLayout>

      <BIDetalhesDrawer
        open={page.drawer.open}
        onClose={page.closeDrawer}
        title={page.drawerContent.title}
        subtitle={page.drawerContent.subtitle}
        stats={page.drawerContent.stats}
        actionLabel={page.drawerContent.actionLabel}
        onAction={page.drawerContent.onAction}
        items={page.drawerContent.items}
      />
    </>
  );
}

export default BIPage;
