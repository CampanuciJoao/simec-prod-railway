import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateRight,
  faPlus,
  faMicrochip,
  faTriangleExclamation,
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
  const totalFiltrado = page.pagination.total ?? page.metricas.total ?? 0;

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
          <PageSection>
            <PageState
              loading={isInitialLoading}
              error={page.error || ''}
              isEmpty={isEmpty}
              emptyMessage="Nenhum equipamento encontrado."
            />

            {hasError ? (
              <div
                className="mt-5 flex flex-col gap-4 rounded-3xl border p-4 md:flex-row md:items-center md:justify-between"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-soft)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: 'var(--color-danger-soft)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      A lista nao carregou como esperado
                    </p>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Mantive filtros e acoes do modulo disponiveis para voce
                      tentar novamente sem perder contexto.
                    </p>
                  </div>
                </div>

                <Button type="button" variant="secondary" onClick={page.refetch}>
                  <FontAwesomeIcon icon={faArrowRotateRight} />
                  Tentar novamente
                </Button>
              </div>
            ) : null}
          </PageSection>
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
                  <strong>{totalFiltrado}</strong> equipamento(s).
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
