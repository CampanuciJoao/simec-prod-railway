import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faFileContract } from '@fortawesome/free-solid-svg-icons';

import { useContratosPage } from '../../hooks/contratos/useContratosPage';

import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import Button from '../../components/ui/primitives/Button';

import ContratosListSection from '../../components/contratos/ContratosListSection';

function ContratosPage() {
  const page = useContratosPage();

  const isInitialLoading = page.loading && page.contratos.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.contratos.length === 0;

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.confirmarExclusao}
        title="Excluir contrato"
        message={`Tem certeza que deseja excluir o contrato nº ${page.deleteModal.modalData?.numeroContrato}?`}
        isDestructive
      />

      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Gestão de Contratos de Manutenção"
          subtitle="Acompanhe, filtre e gerencie os contratos cadastrados"
          icon={faFileContract}
          actions={
            <Button type="button" onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlusCircle} />
              Novo Contrato
            </Button>
          }
        />

        {isInitialLoading || hasError || isEmpty ? (
          <PageState
            loading={isInitialLoading}
            error={page.error || ''}
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
      </PageLayout>
    </>
  );
}

export default ContratosPage;