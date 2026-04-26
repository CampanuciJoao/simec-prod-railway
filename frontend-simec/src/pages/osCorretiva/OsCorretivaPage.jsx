import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOsCorretivaPage } from '@/hooks/osCorretiva/useOsCorretivaPage';
import OsCorretivaListSection from '@/components/osCorretiva/OsCorretivaListSection';
import OsCorretivaPageHeader from '@/components/osCorretiva/OsCorretivaPageHeader';
import ModalConfirmacaoOs from '@/components/osCorretiva/ModalConfirmacaoOs';
import { PageLayout, PageState } from '@/components/ui';

function OsCorretivaPage() {
  const { usuario } = useAuth();
  const page = useOsCorretivaPage();

  const isLoading = page.loading && page.osCorretivas.length === 0;
  const hasError = Boolean(page.error);
  const isEmpty = !page.loading && !page.error && page.osCorretivas.length === 0;

  return (
    <>
      <ModalConfirmacaoOs
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.handleConfirmDelete}
        os={page.deleteModal.modalData}
      />

      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <OsCorretivaPageHeader onCreate={page.goToCreate} />

          {isLoading || hasError || isEmpty ? (
            <PageState
              loading={isLoading}
              error={page.error || ''}
              isEmpty={isEmpty}
              emptyMessage="Nenhuma OS Corretiva encontrada."
            />
          ) : (
            <OsCorretivaListSection
              osCorretivas={page.osCorretivas}
              searchTerm={page.searchTerm}
              onSearchChange={page.handleSearchChange}
              selectFilters={page.selectFiltersConfig}
              activeFilters={page.activeFilters}
              onRemoveFilter={page.clearFilter}
              onClearAll={page.clearAllFilters}
              onDelete={(item) => page.deleteModal.openModal(item)}
              isAdmin={usuario?.role === 'admin'}
              metricas={page.metricas}
              total={page.pagination?.total}
              hasNextPage={page.pagination?.hasNextPage}
              loadingMore={page.loadingMore}
              onLoadMore={page.carregarMais}
            />
          )}
        </div>
      </PageLayout>
    </>
  );
}

export default OsCorretivaPage;
