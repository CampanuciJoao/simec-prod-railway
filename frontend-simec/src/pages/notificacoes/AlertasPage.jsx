import React from 'react';
import { faBell, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useAlertasPage } from '@/hooks/alertas/useAlertasPage';

import {
  Button,
  GlobalFilterBar,
  PageHeader,
  PageLayout,
  PageState,
  Pagination,
  SkeletonList,
} from '@/components/ui';

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

  // Empty state contextual: usuário está com o filtro default (NaoVisto)
  // e a lista veio vazia → significa que não há nada pendente. Convidamos
  // a revisar os vistos.
  const isDefaultEmpty =
    isEmpty
    && !page.searchTerm
    && page.filtros.status === 'NaoVisto'
    && !page.filtros.tipo
    && !page.filtros.prioridade;

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Alertas do Sistema"
          subtitle="Acompanhe, filtre e trate notificações operacionais e recomendações inteligentes"
          icon={faBell}
          actions={
            page.metricas.total > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={page.marcarTodosComoLidos}
                disabled={page.metricas.naoVistos === 0}
                title={
                  page.metricas.naoVistos === 0
                    ? 'Todos os alertas já estão lidos'
                    : `Marca os ${page.metricas.naoVistos} alerta(s) não vistos como lidos`
                }
              >
                <FontAwesomeIcon icon={faCheckDouble} />
                Marcar todos como lidos
              </Button>
            ) : null
          }
        />

        <AlertasKpiGrid
          metricas={page.metricas}
          totalRecomendacoes={page.metricas.recomendacoes}
          onClearAll={page.clearAllFilters}
          onFilterNaoVistos={buildQuickFilterHandler(page, { filterId: 'status', value: 'NaoVisto' })}
          onFilterVistos={buildQuickFilterHandler(page, { filterId: 'status', value: 'Visto' })}
          onFilterCriticos={buildQuickFilterHandler(page, { filterId: 'prioridade', value: 'Alta' })}
          onFilterRecomendacoes={buildQuickFilterHandler(page, { filterId: 'tipo', value: 'Recomendação' })}
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
          <SkeletonList rows={5} cols={3} />
        ) : hasError ? (
          <PageState error="Erro ao carregar alertas." />
        ) : isEmpty ? (
          isDefaultEmpty ? (
            <PageState
              isEmpty
              emptyMessage="Você está em dia. Nenhum alerta não visto. Filtre por VISTOS para revisar alertas já tratados."
            />
          ) : (
            <PageState isEmpty emptyMessage="Nenhum alerta encontrado para os critérios selecionados." />
          )
        ) : (
          <div className="space-y-4">
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

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {page.pagination.total > 0
                  ? `${page.pagination.total} alerta(s) no total`
                  : ''}
              </p>
              <Pagination
                page={page.pagination.page}
                totalPages={page.pagination.totalPages}
                onPageChange={page.goToPage}
              />
            </div>
          </div>
        )}

        <AlertasInfoPanel />
      </div>
    </PageLayout>
  );
}

export default AlertasPage;
