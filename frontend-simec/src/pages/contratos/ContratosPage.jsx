import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlusCircle,
  faFileContract,
} from '@fortawesome/free-solid-svg-icons';

import { useContratosPage } from '@/hooks/contratos/useContratosPage';

import {
  Button,
  ModalConfirmacao,
  PageHeader,
  PageLayout,
  PageState,
} from '@/components/ui';

import ContratosListSection from '@/components/contratos/ContratosListSection';

function ContratosPage() {
  const page = useContratosPage();

  const isInitialLoading = page.loading && page.contratos.length === 0;
  const hasError = Boolean(page.error);
  const isEmpty =
    !page.loading &&
    !page.error &&
    Array.isArray(page.contratos) &&
    page.contratos.length === 0;

  const shouldShowState = isInitialLoading || hasError || isEmpty;

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <ModalConfirmacao
          isOpen={page.deleteModal.isOpen}
          onClose={page.deleteModal.closeModal}
          onConfirm={page.confirmarExclusao}
          title="Excluir contrato"
          message={`Tem certeza que deseja excluir o contrato nº ${page.deleteModal.modalData?.numeroContrato}?`}
          isDestructive
        />

        <PageHeader
          title="Gestão de Contratos de Manutenção"
          subtitle="Acompanhe, filtre e gerencie os contratos cadastrados"
          icon={faFileContract}
          actions={
            <Button type="button" onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlusCircle} />
              <span>Novo Contrato</span>
            </Button>
          }
        />

        {shouldShowState ? (
          <PageState
            loading={isInitialLoading}
            error={page.error?.message || page.error || ''}
            isEmpty={isEmpty}
            emptyMessage="Nenhum contrato encontrado."
          />
        ) : (
          <ContratosListSection
            contratos={page.contratos}
            metricas={page.metricas}
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            selectFiltersConfig={page.selectFiltersConfig}
            activeFilters={page.activeFilters}
            clearFilter={page.clearFilter}
            clearAllFilters={page.clearAllFilters}
            filtrarPorStatus={page.filtrarPorStatus}
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
  );
}

export default ContratosPage;
