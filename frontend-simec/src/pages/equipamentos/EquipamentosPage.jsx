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
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.equipamentos.length === 0;

  return (
    <PageLayout background="slate" padded fullHeight className="font-sans">
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.handleConfirmDelete}
        title="Excluir"
        message="Deseja excluir este registro?"
        isDestructive={true}
      />

      <PageHeader
        title="Gerenciamento de Ativos"
        icon={faMicrochip}
        actions={
          <button
            type="button"
            className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black transition-all flex items-center gap-2 shadow-md uppercase"
            onClick={page.goToCreate}
          >
            <FontAwesomeIcon icon={faPlus} />
            Adicionar Equipamento
          </button>
        }
      />

      <PageSection noPadding className="mb-8 overflow-hidden">
        <GlobalFilterBar
          searchTerm={page.searchTerm}
          onSearchChange={page.onSearchChange}
          searchPlaceholder="Buscar por modelo, tag ou unidade..."
          selectFilters={page.selectFiltersConfig}
        />
      </PageSection>

      {(isInitialLoading || hasError || isEmpty) ? (
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