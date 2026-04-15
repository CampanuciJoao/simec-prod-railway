import React from 'react';

// CONTEXT / HOOKS
import { useAuth } from '@/contexts/AuthContext';
import { useManutencoesPage } from '@/hooks/manutencoes/useManutencoesPage';

// DOMAIN
import ManutencoesPageHeader from '@/components/manutencoes/ManutencoesPageHeader';
import ModalConfirmacaoManutencao from '@/components/manutencoes/ModalConfirmacaoManutencao';
import ManutencoesListSection from '@/components/manutencoes/ManutencoesListSection';

// UI
import { PageLayout, PageState } from '@/components/ui';

function ManutencoesPage() {
  const { usuario } = useAuth();
  const page = useManutencoesPage();

  const isLoading = page.loading && page.manutencoes.length === 0;
  const hasError = !!page.error;
  const isEmpty =
    !page.loading && !page.error && page.manutencoes.length === 0;

  return (
    <>
      <ModalConfirmacaoManutencao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.handleConfirmDelete}
        manutencao={page.deleteModal.modalData}
      />

      <PageLayout background="slate" padded fullHeight>
        <ManutencoesPageHeader onCreate={page.goToCreate} />

        {isLoading || hasError || isEmpty ? (
          <PageState
            loading={isLoading}
            error={page.error?.message || page.error || ''}
            isEmpty={isEmpty}
            emptyMessage="Nenhuma manutenção encontrada."
          />
        ) : (
          <ManutencoesListSection
            manutencoes={page.manutencoes}
            filtros={page.filtros}
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            selectFilters={page.selectFiltersConfig}
            activeFilters={page.activeFilters}
            onRemoveFilter={page.clearFilter}
            onClearAll={page.clearAllFilters}
            onDelete={(item) => page.deleteModal.openModal(item)}
            isAdmin={usuario?.role === 'admin'}
            metricas={page.metricas}
          />
        )}
      </PageLayout>
    </>
  );
}

export default ManutencoesPage;