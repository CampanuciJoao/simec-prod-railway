import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateRight,
  faPlus,
  faMicrochip,
  faTriangleExclamation,
  faClipboardCheck,
  faList,
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
  ResponsiveTabs,
  SkeletonList,
} from '@/components/ui';

import {
  EquipamentosList,
  EquipamentosKpiGrid,
  EquipamentosActiveFiltersBar,
} from '@/components/equipamentos';

import { ControleQualidadeFrotaTab } from '@/components/controleQualidade';

const TABS = [
  { id: 'cadastrados', label: 'Equipamentos cadastrados', icon: <FontAwesomeIcon icon={faList} /> },
  { id: 'controleQualidade', label: 'Controle de Qualidade', icon: <FontAwesomeIcon icon={faClipboardCheck} /> },
];

function EquipamentosPage() {
  const page = useEquipamentosPage();
  const expansion = useEquipamentosExpansion('visaoGeral');
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.tab === 'controleQualidade' ? 'controleQualidade' : 'cadastrados'
  );

  const isInitialLoading = page.loading && page.equipamentos.length === 0;
  const hasError = Boolean(page.error);
  const isEmpty =
    !page.loading &&
    !page.error &&
    Array.isArray(page.equipamentos) &&
    page.equipamentos.length === 0;

  const totalFiltrado = page.pagination.total ?? page.metricas.total ?? 0;

  const aplicarFiltroStatus = (status) => {
    page.clearAllFilters();
    const statusFilter = page.selectFiltersConfig.find((f) => f.id === 'status');
    statusFilter?.onChange(status);
  };

  useEffect(() => {
    const filtroStatus = location.state?.filtroStatus;
    if (filtroStatus) aplicarFiltroStatus(filtroStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            activeTab === 'cadastrados' ? (
              <div className="flex items-center gap-2">
                <Button type="button" onClick={page.goToCreate}>
                  <FontAwesomeIcon icon={faPlus} />
                  <span>Adicionar equipamento</span>
                </Button>
              </div>
            ) : null
          }
        />

        <ResponsiveTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'controleQualidade' ? (
          <ControleQualidadeFrotaTab />
        ) : (
          <EquipamentosCadastradosTab
            page={page}
            expansion={expansion}
            isInitialLoading={isInitialLoading}
            hasError={hasError}
            isEmpty={isEmpty}
            totalFiltrado={totalFiltrado}
            aplicarFiltroStatus={aplicarFiltroStatus}
          />
        )}
      </div>
    </PageLayout>
  );
}

function EquipamentosCadastradosTab({
  page,
  expansion,
  isInitialLoading,
  hasError,
  isEmpty,
  totalFiltrado,
  aplicarFiltroStatus,
}) {
  return (
    <div className="space-y-6">
      <EquipamentosKpiGrid
        metricas={page.metricas}
        onClearAllFilters={page.clearAllFilters}
        onFilterStatus={aplicarFiltroStatus}
      />

      <GlobalFilterBar
        searchTerm={page.searchTerm}
        onSearchChange={page.onSearchChange}
        searchPlaceholder="Buscar por modelo, apelido, tag ou unidade..."
        selectFilters={page.selectFiltersConfig}
      />

      <EquipamentosActiveFiltersBar
        filters={page.activeFilters}
        onRemove={page.clearFilter}
        onClearAll={page.clearAllFilters}
      />

      {isInitialLoading ? (
        <SkeletonList rows={7} cols={5} />
      ) : hasError ? (
        <PageSection>
          <PageState error={page.error || ''} />
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
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  A lista não carregou como esperado
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Mantive filtros e ações do módulo disponíveis para você tentar novamente sem perder contexto.
                </p>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={page.refetch}>
              <FontAwesomeIcon icon={faArrowRotateRight} />
              Tentar novamente
            </Button>
          </div>
        </PageSection>
      ) : isEmpty ? (
        <PageSection>
          <PageState isEmpty emptyMessage="Nenhum equipamento encontrado." />
        </PageSection>
      ) : (
        <div className="space-y-4">
          <EquipamentosList
            equipamentos={page.equipamentos}
            expansion={expansion}
            onStatusUpdated={page.atualizarStatusLocalmente}
            onRefresh={page.refetch}
          />

          <PageSection>
            <div
              className="flex flex-col items-center justify-center gap-3 text-sm md:flex-row md:justify-between"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>
                Exibindo <strong style={{ color: 'var(--text-primary)' }}>{page.equipamentos.length}</strong> de{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{totalFiltrado}</strong> equipamento(s).
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
  );
}

export default EquipamentosPage;
