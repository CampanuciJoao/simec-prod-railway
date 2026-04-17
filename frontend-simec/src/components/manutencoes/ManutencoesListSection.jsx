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
  GlobalFilterBar,
  KpiCard,
  KpiGrid,
  PageSection,
} from '@/components/ui';

import { ManutencaoCard } from '@/components/manutencoes';

function ManutencoesListSection({
  manutencoes,
  searchTerm,
  onSearchChange,
  selectFilters,
  activeFilters,
  onRemoveFilter,
  onClearAll,
  onDelete,
  isAdmin,
  metricas,
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
          {manutencoes.map((manutencao) => (
            <ManutencaoCard
              key={manutencao.id}
              manutencao={manutencao}
              isAdmin={isAdmin}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </PageSection>
  );
}

ManutencoesListSection.propTypes = {
  manutencoes: PropTypes.array.isRequired,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  selectFilters: PropTypes.array,
  activeFilters: PropTypes.array,
  onRemoveFilter: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
  metricas: PropTypes.object,
};

export default ManutencoesListSection;