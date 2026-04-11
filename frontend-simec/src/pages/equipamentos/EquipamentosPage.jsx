import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMicrochip } from '@fortawesome/free-solid-svg-icons';

import { useEquipamentosPage } from '../../hooks/equipamentos/useEquipamentosPage';
import { useEquipamentosExpansion } from '../../hooks/equipamentos/useEquipamentosExpansion';

import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import EquipamentosList from '../../components/equipamentos/EquipamentosList';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

function EquipamentosPage() {
  const page = useEquipamentosPage();
  const expansion = useEquipamentosExpansion('cadastro');

  const isInitialLoading = page.loading && page.equipamentos.length === 0;
  const hasError = Boolean(page.error);
  const isEmpty =
    !page.loading &&
    !page.error &&
    Array.isArray(page.equipamentos) &&
    page.equipamentos.length === 0;

  const shouldShowState = isInitialLoading || hasError || isEmpty;

  return (
    <PageLayout background="slate" padded fullHeight className="font-sans">
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.handleConfirmDelete}
        title="Excluir equipamento"
        message="Deseja excluir este equipamento?"
        isDestructive
      />

      <PageHeader
        title="Gerenciamento de Ativos"
        icon={faMicrochip}
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            onClick={page.goToCreate}
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Adicionar equipamento</span>
          </button>
        }
      />

      <PageSection noPadding className="mb-8 overflow-hidden rounded-2xl">
        <GlobalFilterBar
          searchTerm={page.searchTerm}
          onSearchChange={page.onSearchChange}
          searchPlaceholder="Buscar por modelo, tag ou unidade..."
          selectFilters={page.selectFiltersConfig}
        />
      </PageSection>

      {shouldShowState ? (
        <PageState
          loading={isInitialLoading}
          error={page.error?.message || page.error || ''}
          isEmpty={isEmpty}
          emptyMessage="Nenhum equipamento encontrado."
        />
      ) : (
        <EquipamentosList
          equipamentos={page.equipamentos}
          expansion={expansion}
          onGoToFichaTecnica={page.goToFichaTecnica}
          onStatusUpdated={page.atualizarStatusLocalmente}
          onRefresh={page.refetch}
        />
      )}
    </PageLayout>
  );
}

export default EquipamentosPage;