import React, { useMemo } from 'react';

// CONTEXT / HOOKS
import { useAuth } from '@/contexts/AuthContext';
import { useManutencoesPage } from '@/hooks/manutencoes/useManutencoesPage';
import { useOsCorretiva } from '@/hooks/osCorretiva/useOsCorretiva';
import { useModal } from '@/hooks/shared/useModal';

// DOMAIN
import {
  ManutencoesListSection,
  ManutencoesPageHeader,
  ModalConfirmacaoManutencao,
} from '@/components/manutencoes';

// UI
import { PageLayout, PageState, ModalConfirmacao } from '@/components/ui';

function ManutencoesPage() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.role === 'admin';

  const page = useManutencoesPage();
  const os = useOsCorretiva();
  const osDeleteModal = useModal();

  const handleConfirmDeleteOs = async () => {
    const id = osDeleteModal.modalData?.id;
    if (!id) return;
    try {
      await os.removerOs(id);
      osDeleteModal.closeModal();
    } catch {
      // toast shown in hook
    }
  };

  // Merge both lists with a discriminator and a common sort date, newest first
  const unifiedItems = useMemo(() => {
    const mItems = page.manutencoes.map((m) => ({
      ...m,
      _kind: 'manutencao',
      _sortDate: m.dataHoraAgendamentoInicio || m.createdAt || '',
    }));
    const osItems = os.osCorretivas.map((o) => ({
      ...o,
      _kind: 'osCorretiva',
      _sortDate: o.dataHoraAbertura || o.createdAt || '',
    }));
    return [...mItems, ...osItems].sort((a, b) => {
      if (!a._sortDate) return 1;
      if (!b._sortDate) return -1;
      return new Date(b._sortDate) - new Date(a._sortDate);
    });
  }, [page.manutencoes, os.osCorretivas]);

  const isLoading = (page.loading && page.manutencoes.length === 0) && (os.loading && os.osCorretivas.length === 0);
  const hasError = Boolean(page.error);
  const isEmpty = !page.loading && !os.loading && !page.error && unifiedItems.length === 0;

  const combinedTotal = (page.pagination?.total ?? 0) + (os.pagination?.total ?? 0);
  const combinedHasNextPage = Boolean(page.pagination?.hasNextPage || os.pagination?.hasNextPage);
  const combinedLoadingMore = page.loadingMore || os.loadingMore;

  const handleLoadMore = () => {
    if (page.pagination?.hasNextPage) page.carregarMais();
    if (os.pagination?.hasNextPage) os.carregarMais();
  };

  // Combined metricas: manutenções + OS corretivas counts
  const combinedMetricas = useMemo(() => ({
    total: (page.metricas?.total ?? 0) + (os.metricas?.total ?? 0),
    aguardando: (page.metricas?.aguardando ?? 0) + (os.metricas?.abertas ?? 0) + (os.metricas?.emAndamento ?? 0),
    concluidas: (page.metricas?.concluidas ?? 0) + (os.metricas?.concluidas ?? 0),
    canceladas: page.metricas?.canceladas ?? 0,
  }), [page.metricas, os.metricas]);

  return (
    <>
      <ModalConfirmacaoManutencao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.handleConfirmDelete}
        manutencao={page.deleteModal.modalData}
      />

      <ModalConfirmacao
        isOpen={osDeleteModal.isOpen}
        onClose={osDeleteModal.closeModal}
        onConfirm={handleConfirmDeleteOs}
        title="Excluir OS Corretiva"
        message={`Deseja excluir a OS ${osDeleteModal.modalData?.numeroOS}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        isDestructive
      />

      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <ManutencoesPageHeader
            onCreate={page.goToCreate}
            onRegistrarOcorrencia={page.goToRegistrarOcorrencia}
          />

          {isLoading || hasError || isEmpty ? (
            <PageState
              loading={isLoading}
              error={page.error?.message || page.error || ''}
              isEmpty={isEmpty}
              emptyMessage="Nenhuma manutenção encontrada."
            />
          ) : (
            <ManutencoesListSection
              items={unifiedItems}
              searchTerm={page.searchTerm}
              onSearchChange={page.onSearchChange}
              selectFilters={page.selectFiltersConfig}
              activeFilters={page.activeFilters}
              onRemoveFilter={page.clearFilter}
              onClearAll={page.clearAllFilters}
              onDelete={(item) => page.deleteModal.openModal(item)}
              onDeleteOs={(o) => osDeleteModal.openModal(o)}
              isAdmin={isAdmin}
              metricas={combinedMetricas}
              total={combinedTotal}
              hasNextPage={combinedHasNextPage}
              loadingMore={combinedLoadingMore}
              onLoadMore={handleLoadMore}
            />
          )}
        </div>
      </PageLayout>
    </>
  );
}

export default ManutencoesPage;
