import { useUnidadesPage } from '@/hooks/unidades/useUnidadesPage';

import PageLayout from '@/components/ui/layout/PageLayout';
import PageState from '@/components/ui/feedback/PageState';
import GlobalFilterBar from '@/components/ui/filters/GlobalFilterBar';
import ModalConfirmacao from '@/components/ui/feedback/ModalConfirmacao';

import {
  UnidadesPageHeader,
  UnidadesMetricsSection,
  UnidadesListSection,
  UnidadesActiveFiltersBar,
} from '@/components/unidades';

function UnidadesPage() {
  const page = useUnidadesPage();

  const isLoading = page.loading && page.unidades.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.unidades.length === 0;

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.confirmarExclusao}
        title="Excluir unidade"
        message="Tem certeza?"
        isDestructive
      />

      <PageLayout background="slate" padded fullHeight>
        <div className="space-y-6">
          <UnidadesPageHeader onCreate={page.goToCreate} />

          <UnidadesMetricsSection
            metricas={page.metricas}
            onClear={page.clearAllFilters}
          />

          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            selectFilters={page.selectFiltersConfig}
          />

          <UnidadesActiveFiltersBar
            filters={page.activeFilters}
            onRemove={page.clearFilter}
            onClearAll={page.clearAllFilters}
          />

          {isLoading || hasError || isEmpty ? (
            <PageState
              loading={isLoading}
              error={page.error || ''}
              isEmpty={isEmpty}
            />
          ) : (
            <UnidadesListSection
              unidades={page.unidades}
              actions={{
                edit: page.goToEdit,
                delete: page.deleteModal.openModal,
              }}
            />
          )}
        </div>
      </PageLayout>
    </>
  );
}

export default UnidadesPage;