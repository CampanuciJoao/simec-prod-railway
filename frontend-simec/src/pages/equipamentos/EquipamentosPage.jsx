import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';

import { useEquipamentosPage } from '@/hooks/equipamentos/useEquipamentosPage';
import { useEquipamentosExpansion } from '@/hooks/equipamentos/useEquipamentosExpansion';

import GlobalFilterBar from '@/components/ui/filters/GlobalFilterBar';
import ModalConfirmacao from '@/components/ui/feedback/ModalConfirmacao';
import PageLayout from '@/components/ui/layout/PageLayout';
import PageHeader from '@/components/ui/layout/PageHeader';
import PageState from '@/components/ui/feedback/PageState';
import Button from '@/components/ui/primitives/Button';

import {
  EquipamentosList,
  EquipamentosKpiGrid,
  EquipamentosActiveFiltersBar,
} from '@/components/equipamentos';

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

  const aplicarFiltroStatus = (status) => {
    page.clearAllFilters();
    const statusFilter = page.selectFiltersConfig.find((f) => f.id === 'status');
    statusFilter?.onChange(status);
  };

  return (
    <PageLayout background="slate" padded fullHeight className="font-sans">
      <div className="space-y-6">
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
          subtitle="Acompanhe, filtre e gerencie os equipamentos cadastrados"
          icon={faMicrochip}
          actions={
            <Button type="button" onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlus} />
              <span>Adicionar equipamento</span>
            </Button>
          }
        />

        <EquipamentosKpiGrid
          metricas={page.metricas}
          onClearAllFilters={page.clearAllFilters}
          onFilterStatus={aplicarFiltroStatus}
        />

        <div className="mb-6">
          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            searchPlaceholder="Buscar por modelo, tag ou unidade..."
            selectFilters={page.selectFiltersConfig}
          />
        </div>

        <EquipamentosActiveFiltersBar
          filters={page.activeFilters}
          onRemove={page.clearFilter}
          onClearAll={page.clearAllFilters}
        />

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
      </div>
    </PageLayout>
  );
}

export default EquipamentosPage;