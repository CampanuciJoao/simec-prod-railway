import { useContratosPage } from '@/hooks/contratos/useContratosPage';

import {
  GlobalFilterBar,
  ModalConfirmacao,
  PageLayout,
  PageState,
} from '@/components/ui';

import {
  ContratosActiveFiltersBar,
  ContratosKpiSection,
  ContratosListSection,
  ContratosPageHeader,
} from '@/components/contratos';

function ContratosPage() {
  const page = useContratosPage();

  const isLoading = page.loading && page.contratos.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.contratos.length === 0;

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.confirmarExclusao}
        title="Excluir contrato"
        message={`Tem certeza que deseja excluir o contrato n° ${page.deleteModal.modalData?.numeroContrato}?`}
        isDestructive
      />

      <PageLayout background="slate" padded fullHeight>
        <div className="space-y-6">
          <ContratosPageHeader onCreate={page.goToCreate} />

          <ContratosKpiSection
            metricas={page.metricas}
            clearAllFilters={page.clearAllFilters}
            filtrarPorStatus={page.filtrarPorStatus}
          />

          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            searchPlaceholder="Buscar por numero, fornecedor..."
            selectFilters={page.selectFiltersConfig}
          />

          <ContratosActiveFiltersBar
            filters={page.activeFilters}
            onRemove={page.clearFilter}
            onClearAll={page.clearAllFilters}
          />

          {isLoading || hasError || isEmpty ? (
            <PageState
              loading={isLoading}
              error={page.error || ''}
              isEmpty={isEmpty}
              emptyMessage="Nenhum contrato encontrado."
            />
          ) : (
            <ContratosListSection
              contratos={page.contratos}
              expandidos={page.expandidos}
              toggleExpandir={page.toggleExpandir}
              uploadingId={page.uploadingId}
              handleUploadArquivo={page.handleUploadArquivo}
              handleDeleteAnexo={page.handleDeleteAnexo}
              goToEdit={page.goToEdit}
              onAskDelete={page.deleteModal.openModal}
            />
          )}
        </div>
      </PageLayout>
    </>
  );
}

export default ContratosPage;
