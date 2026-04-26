import React from 'react';

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
import OsCorretivaCard from '@/components/osCorretiva/OsCorretivaCard';

// UI
import { PageLayout, PageState, PageSection, Button, ModalConfirmacao } from '@/components/ui';

function ManutencoesPage() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.role === 'admin';

  const page = useManutencoesPage();

  const os = useOsCorretiva();
  const osDeleteModal = useModal();

  const isLoading = page.loading && page.manutencoes.length === 0;
  const hasError = Boolean(page.error);
  const isEmpty = !page.loading && !page.error && page.manutencoes.length === 0;

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
              manutencoes={page.manutencoes}
              searchTerm={page.searchTerm}
              onSearchChange={page.onSearchChange}
              selectFilters={page.selectFiltersConfig}
              activeFilters={page.activeFilters}
              onRemoveFilter={page.clearFilter}
              onClearAll={page.clearAllFilters}
              onDelete={(item) => page.deleteModal.openModal(item)}
              isAdmin={isAdmin}
              metricas={page.metricas}
              total={page.pagination?.total}
              hasNextPage={page.pagination?.hasNextPage}
              loadingMore={page.loadingMore}
              onLoadMore={page.carregarMais}
            />
          )}

          {/* ── Ocorrências e OS Corretivas ── */}
          <PageSection>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Ocorrências e OS Corretivas
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {os.metricas.total} registro{os.metricas.total !== 1 ? 's' : ''} —{' '}
                  {os.metricas.abertas} aberta{os.metricas.abertas !== 1 ? 's' : ''},&nbsp;
                  {os.metricas.emAndamento} em andamento,&nbsp;
                  {os.metricas.aguardandoTerceiro} aguardando terceiro,&nbsp;
                  {os.metricas.concluidas} concluída{os.metricas.concluidas !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {os.loading && os.osCorretivas.length === 0 ? (
              <PageState loading />
            ) : os.error ? (
              <PageState error={os.error} />
            ) : os.osCorretivas.length === 0 ? (
              <PageState isEmpty emptyMessage="Nenhuma ocorrência ou OS Corretiva registrada." />
            ) : (
              <div className="space-y-4">
                {os.osCorretivas.map((item) => (
                  <OsCorretivaCard
                    key={item.id}
                    os={item}
                    isAdmin={isAdmin}
                    onDelete={(o) => osDeleteModal.openModal(o)}
                  />
                ))}
              </div>
            )}

            {os.pagination.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={os.carregarMais}
                  disabled={os.loadingMore}
                >
                  {os.loadingMore ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </div>
            )}
          </PageSection>
        </div>
      </PageLayout>
    </>
  );
}

export default ManutencoesPage;
