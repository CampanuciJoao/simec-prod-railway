import React from 'react';
import { faBell } from '@fortawesome/free-solid-svg-icons';

import { useAlertasPage } from '@/hooks/alertas/useAlertasPage';

import GlobalFilterBar from '@/components/ui/filters/GlobalFilterBar';
import PageLayout from '@/components/ui/layout/PageLayout';
import PageHeader from '@/components/ui/layout/PageHeader';
import PageState from '@/components/ui/feedback/PageState';

import {
  AlertasKpiGrid,
  AlertasActiveFiltersBar,
  AlertaItem,
  AlertasInfoPanel,
} from '@/components/alertas';

import { buildQuickFilterHandler } from '@/utils/alertas/alertaUtils';

function AlertasPage() {
  const page = useAlertasPage();

  const isInitialLoading = page.loading && page.alertas.length === 0;
  const hasError = Boolean(page.error);
  const isEmpty = !page.loading && page.alertasFiltrados.length === 0;

  const totalRecomendacoes = page.alertas.filter(
    (a) => a.tipo === 'Recomendação'
  ).length;

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Alertas do Sistema"
          subtitle="Acompanhe, filtre e trate notificações operacionais e recomendações inteligentes"
          icon={faBell}
        />

        <AlertasKpiGrid
          metricas={page.metricas}
          totalRecomendacoes={totalRecomendacoes}
          onClearAll={page.clearAllFilters}
          onFilterNaoVistos={buildQuickFilterHandler(page, {
            filterId: 'status',
            value: 'NaoVisto',
          })}
          onFilterVistos={buildQuickFilterHandler(page, {
            filterId: 'status',
            value: 'Visto',
          })}
          onFilterCriticos={buildQuickFilterHandler(page, {
            filterId: 'prioridade',
            value: 'Alta',
          })}
          onFilterRecomendacoes={buildQuickFilterHandler(page, {
            filterId: 'tipo',
            value: 'Recomendação',
          })}
        />

        <div className="mb-6">
          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            searchPlaceholder="Filtrar por título, subtítulo ou tipo..."
            selectFilters={page.selectFiltersConfig}
          />
        </div>

        <AlertasActiveFiltersBar
          filters={page.activeFilters}
          onRemove={page.clearFilter}
          onClearAll={page.clearAllFilters}
        />

        {isInitialLoading ? (
          <PageState loading />
        ) : hasError ? (
          <PageState error="Erro ao carregar alertas." />
        ) : isEmpty ? (
          <PageState
            isEmpty
            emptyMessage="Nenhum alerta encontrado para os critérios selecionados."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {page.alertasFiltrados.map((alerta) => (
              <AlertaItem
                key={alerta.id}
                alerta={alerta}
                onUpdateStatus={page.updateStatus}
                onDismiss={page.dismissAlerta}
              />
            ))}
          </div>
        )}

        <AlertasInfoPanel />
      </div>
    </PageLayout>
  );
}

export default AlertasPage;