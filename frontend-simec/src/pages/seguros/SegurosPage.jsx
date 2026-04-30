import { useSegurosPage } from '@/hooks/seguros/useSegurosPage';

import {
  GlobalFilterBar,
  PageLayout,
  PageState,
  Pagination,
  SkeletonList,
} from '@/components/ui';

import {
  SegurosPageHeader,
  SegurosMetricsSection,
  SegurosListSection,
  SegurosActiveFiltersBar,
} from '@/components/seguros';

function SegurosPage() {
  const page = useSegurosPage();

  const isLoading = page.loading && page.seguros.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.pagination.total === 0;

  return (
    <PageLayout background="slate" padded fullHeight>
        <div className="space-y-6">
          <SegurosPageHeader onCreate={page.goToCreate} />

          <SegurosMetricsSection
            metricas={page.metricas}
            onFilter={page.filtrarPorStatus}
          />

          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            selectFilters={page.selectFiltersConfig}
          />

          <SegurosActiveFiltersBar
            filters={page.activeFilters}
            onRemove={page.clearFilter}
            onClearAll={page.clearAllFilters}
          />

          {isLoading ? (
            <SkeletonList rows={6} cols={4} />
          ) : hasError || isEmpty ? (
            <PageState
              error={page.error || ''}
              isEmpty={isEmpty}
            />
          ) : (
            <div className="space-y-4">
              <SegurosListSection
                seguros={page.seguros}
                getStatus={page.getStatusDinamico}
                isAdmin={page.isAdmin}
                actions={{
                  edit: page.goToEdit,
                  renovar: page.goToRenovar,
                  cancelar: page.handleCancelar,
                  excluir: page.handleExcluirSeguro,
                }}
              />

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {page.pagination.total} seguro(s) no total
                </p>
                <Pagination
                  page={page.pagination.page}
                  totalPages={page.pagination.totalPages}
                  onPageChange={page.goToPage}
                />
              </div>
            </div>
          )}
        </div>
      </PageLayout>
  );
}

export default SegurosPage;
