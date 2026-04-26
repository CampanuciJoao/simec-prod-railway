import React, { useState } from 'react';

// CONTEXT / HOOKS
import { useAuth } from '@/contexts/AuthContext';
import { useManutencoesPage } from '@/hooks/manutencoes/useManutencoesPage';

// DOMAIN
import {
  ManutencoesListSection,
  ManutencoesPageHeader,
  ModalConfirmacaoManutencao,
} from '@/components/manutencoes';
import RegistrarOcorrenciaDrawer from '@/components/manutencoes/RegistrarOcorrenciaDrawer';

// UI
import { PageLayout, PageState } from '@/components/ui';

function ManutencoesPage() {
  const { usuario } = useAuth();
  const page = useManutencoesPage();

  const [ocorrenciaDrawerOpen, setOcorrenciaDrawerOpen] = useState(false);
  const [registrandoOcorrencia, setRegistrandoOcorrencia] = useState(false);

  const isLoading = page.loading && page.manutencoes.length === 0;
  const hasError = Boolean(page.error);
  const isEmpty =
    !page.loading && !page.error && page.manutencoes.length === 0;

  async function handleConfirmarOcorrencia(form) {
    setRegistrandoOcorrencia(true);
    try {
      return await page.registrarOcorrencia(form);
    } finally {
      setRegistrandoOcorrencia(false);
    }
  }

  return (
    <>
      <RegistrarOcorrenciaDrawer
        isOpen={ocorrenciaDrawerOpen}
        onClose={() => setOcorrenciaDrawerOpen(false)}
        onConfirm={handleConfirmarOcorrencia}
        submitting={registrandoOcorrencia}
      />

      <ModalConfirmacaoManutencao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.handleConfirmDelete}
        manutencao={page.deleteModal.modalData}
      />

      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <ManutencoesPageHeader
            onCreate={page.goToCreate}
            onRegistrarOcorrencia={() => setOcorrenciaDrawerOpen(true)}
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
              isAdmin={usuario?.role === 'admin'}
              metricas={page.metricas}
              total={page.pagination?.total}
              hasNextPage={page.pagination?.hasNextPage}
              loadingMore={page.loadingMore}
              onLoadMore={page.carregarMais}
            />
          )}
        </div>
      </PageLayout>
    </>
  );
}

export default ManutencoesPage;
