import { useSegurosPage } from '@/hooks/seguros/useSegurosPage';

import PageLayout from '@/components/ui/layout/PageLayout';
import PageState from '@/components/ui/feedback/PageState';
import GlobalFilterBar from '@/components/ui/filters/GlobalFilterBar';
import ModalConfirmacao from '@/components/ui/feedback/ModalConfirmacao';

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
  const isEmpty = !page.loading && !page.error && page.seguros.length === 0;

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.confirmarExclusao}
        title="Excluir seguro"
        message="Tem certeza?"
        isDestructive
      />

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

          {isLoading || hasError || isEmpty ? (
            <PageState
              loading={isLoading}
              error={page.error || ''}
              isEmpty={isEmpty}
            />
          ) : (
            <SegurosListSection
              seguros={page.seguros}
              getStatus={page.getStatusDinamico}
              actions={{
                view: page.goToDetails,
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

export default SegurosPage;