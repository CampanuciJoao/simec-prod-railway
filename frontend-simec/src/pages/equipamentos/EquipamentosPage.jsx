import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMicrochip,
  faCircleCheck,
  faTriangleExclamation,
  faCircleXmark,
  faScrewdriverWrench,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useEquipamentosPage } from '../../hooks/equipamentos/useEquipamentosPage';
import { useEquipamentosExpansion } from '../../hooks/equipamentos/useEquipamentosExpansion';

import GlobalFilterBar from '../../components/ui/filters/GlobalFilterBar';
import ModalConfirmacao from '@/components/ui/feedback/ModalConfirmacao';
import EquipamentosList from '../../components/equipamentos/EquipamentosList';

import PageLayout from '../../components/ui/layout/PageLayout';
import PageHeader from '../../components/ui/layout/PageHeader';
import PageState from '@/components/ui/feedback/PageState';
import Card from '../../components/ui/primitives/Card';

function KpiCard({ icon, title, value, tone = 'slate', onClick }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full text-left',
        onClick ? 'transition hover:-translate-y-0.5 hover:shadow-md' : '',
      ].join(' ')}
    >
      <Card className="h-full">
        <div className="flex items-center gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
              toneMap[tone] || toneMap.slate,
            ].join(' ')}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
          </div>
        </div>
      </Card>
    </Wrapper>
  );
}

function ActiveFiltersBar({ filters = [], onRemove, onClearAll }) {
  if (!filters.length) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={`${filter.key}-${filter.value}`}
          type="button"
          onClick={() => onRemove(filter.key)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span>{filter.label}</span>
          <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold text-blue-600 hover:underline"
      >
        Limpar filtros
      </button>
    </div>
  );
}

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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={faMicrochip}
          title="Total"
          value={page.metricas.total}
          tone="slate"
          onClick={page.clearAllFilters}
        />

        <KpiCard
          icon={faCircleCheck}
          title="Operantes"
          value={page.metricas.operantes}
          tone="green"
          onClick={() => aplicarFiltroStatus('Operante')}
        />

        <KpiCard
          icon={faScrewdriverWrench}
          title="Em manutenção"
          value={page.metricas.emManutencao}
          tone="yellow"
          onClick={() => aplicarFiltroStatus('EmManutencao')}
        />

        <KpiCard
          icon={faCircleXmark}
          title="Inoperantes"
          value={page.metricas.inoperantes}
          tone="red"
          onClick={() => aplicarFiltroStatus('Inoperante')}
        />

        <KpiCard
          icon={faTriangleExclamation}
          title="Uso limitado"
          value={page.metricas.usoLimitado}
          tone="blue"
          onClick={() => aplicarFiltroStatus('UsoLimitado')}
        />
      </div>

      <div className="mb-6">
        <GlobalFilterBar
          searchTerm={page.searchTerm}
          onSearchChange={page.onSearchChange}
          searchPlaceholder="Buscar por modelo, tag ou unidade..."
          selectFilters={page.selectFiltersConfig}
        />
      </div>

      <ActiveFiltersBar
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
    </PageLayout>
  );
}

export default EquipamentosPage;