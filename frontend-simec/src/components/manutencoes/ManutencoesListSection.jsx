import React from 'react';
import PropTypes from 'prop-types';
import {
  faClock,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import {
  ActiveFiltersBar,
  Button,
  GlobalFilterBar,
  KpiCard,
  KpiGrid,
  PageSection,
} from '@/components/ui';

import { ManutencaoCard } from '@/components/manutencoes';
import OsCorretivaCard from '@/components/osCorretiva/OsCorretivaCard';

function ManutencoesListSection({
  items,
  searchTerm,
  onSearchChange,
  selectFilters,
  activeFilters,
  onRemoveFilter,
  onClearAll,
  onDelete,
  onDeleteOs,
  isAdmin,
  metricas,
  total,
  hasNextPage,
  loadingMore,
  onLoadMore,
}) {
  return (
    <PageSection>
      <div className="space-y-6">
        <KpiGrid>
          <KpiCard
            icon={faClock}
            title="Total"
            value={metricas?.total ?? 0}
            subtitle="Todas as ordens"
            tone="slate"
            onClick={onClearAll}
          />

          <KpiCard
            icon={faTriangleExclamation}
            title="Aguardando"
            value={metricas?.aguardando ?? 0}
            subtitle="Pendentes de ação"
            tone="orange"
          />

          <KpiCard
            icon={faCircleCheck}
            title="Concluídas"
            value={metricas?.concluidas ?? 0}
            subtitle="Finalizadas com sucesso"
            tone="green"
          />

          <KpiCard
            icon={faCircleXmark}
            title="Canceladas"
            value={metricas?.canceladas ?? 0}
            subtitle="Ordens encerradas"
            tone="slate"
          />
        </KpiGrid>

        <GlobalFilterBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar por OS, equipamento, unidade ou descrição..."
          selectFilters={selectFilters}
        />

        <ActiveFiltersBar
          filters={activeFilters}
          onRemove={onRemoveFilter}
          onClearAll={onClearAll}
        />

        <div className="space-y-4">
          {items.map((item) =>
            item._kind === 'osCorretiva' ? (
              <OsCorretivaCard
                key={`os-${item.id}`}
                os={item}
                isAdmin={isAdmin}
                onDelete={onDeleteOs}
              />
            ) : (
              <ManutencaoCard
                key={`m-${item.id}`}
                manutencao={item}
                isAdmin={isAdmin}
                onDelete={onDelete}
              />
            )
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 text-sm text-slate-500 md:flex-row md:justify-between">
          <span>
            Exibindo <strong>{items.length}</strong> de{' '}
            <strong>{total ?? items.length}</strong> registro(s).
          </span>

          {hasNextPage ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </Button>
          ) : null}
        </div>
      </div>
    </PageSection>
  );
}

ManutencoesListSection.propTypes = {
  items: PropTypes.array.isRequired,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  selectFilters: PropTypes.array,
  activeFilters: PropTypes.array,
  onRemoveFilter: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDeleteOs: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
  metricas: PropTypes.object,
  total: PropTypes.number,
  hasNextPage: PropTypes.bool,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

export default ManutencoesListSection;
