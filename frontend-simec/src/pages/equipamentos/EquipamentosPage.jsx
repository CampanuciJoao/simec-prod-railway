import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';

import { useEquipamentosPage } from '@/hooks/equipamentos/useEquipamentosPage';
import { useEquipamentosExpansion } from '@/hooks/equipamentos/useEquipamentosExpansion';

import {
  Button,
  GlobalFilterBar,
  ModalConfirmacao,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';

import {
  EquipamentosList,
  EquipamentosKpiGrid,
  EquipamentosActiveFiltersBar,
} from '@/components/equipamentos';

function EquipamentosPage() {
  const page = useEquipamentosPage();
  const expansion = useEquipamentosExpansion('visaoGeral');

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

    const statusFilter = page.selectFiltersConfig.find(
      (filter) => filter.id === 'status'
    );

    statusFilter?.onChange(status);
  };

  return (
    <PageLayout padded fullHeight>
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

        <GlobalFilterBar
          searchTerm={page.searchTerm}
          onSearchChange={page.onSearchChange}
          searchPlaceholder="Buscar por modelo, tag ou unidade..."
          selectFilters={page.selectFiltersConfig}
        />

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
          <div className="space-y-4">
            <EquipamentosList
              equipamentos={page.equipamentos}
              expansion={expansion}
              onGoToFichaTecnica={page.goToFichaTecnica}
              onOpenFullPage={page.goToDetalhes}
              onStatusUpdated={page.atualizarStatusLocalmente}
              onRefresh={page.refetch}
            />

            <PageSection>
              <div className="flex flex-col items-center justify-center gap-3 text-sm text-slate-500 md:flex-row md:justify-between">
                <span>
                  Exibindo <strong>{page.equipamentos.length}</strong> de{' '}
                  <strong>{page.pagination.total}</strong> equipamento(s).
                </span>

                {page.pagination.hasNextPage ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={page.carregarMais}
                    disabled={page.loadingMore}
                  >
                    {page.loadingMore ? 'Carregando...' : 'Carregar mais'}
                  </Button>
                ) : null}
              </div>
            </PageSection>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default EquipamentosPage;
