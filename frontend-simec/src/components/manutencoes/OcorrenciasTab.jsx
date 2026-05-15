import React from 'react';
import PropTypes from 'prop-types';
import {
  faCircleCheck,
  faCircleXmark,
  faClock,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import {
  ActiveFiltersBar,
  Button,
  GlobalFilterBar,
  KpiCard,
  KpiGrid,
  PageSection,
  PageState,
  SkeletonList,
} from '@/components/ui';

import OsCorretivaCard from '@/components/osCorretiva/OsCorretivaCard';

/**
 * Aba "Ocorrências" da página de Gerenciamento.
 * Lista apenas OsCorretiva tipo='Ocorrencia' (relato de problema sem visita
 * agendada). Quando uma ocorrência ganha visita, vira tipo='Corretiva' e
 * migra para a aba Manutenções.
 */
function OcorrenciasTab({ tab, isAdmin, onDeleteOs }) {
  const kpiActive = (key) =>
    tab.activeKpi === key ? 'ring-2 ring-offset-2 ring-offset-transparent' : '';

  if (tab.loading) {
    return <SkeletonList rows={6} cols={4} />;
  }

  const isEmpty = !tab.loading && !tab.error && tab.items.length === 0;

  return (
    <PageSection>
      <div className="space-y-6">
        <KpiGrid>
          <KpiCard
            icon={faClock}
            title="Total"
            value={tab.metricas?.total ?? 0}
            subtitle="Todas as ocorrências"
            tone="slate"
            onClick={() => tab.handleSelectKpi('total')}
            className={kpiActive('total')}
          />
          <KpiCard
            icon={faTriangleExclamation}
            title="Em andamento"
            value={tab.metricas?.emAndamento ?? 0}
            subtitle="Abertas ou em triagem"
            tone="orange"
            onClick={() => tab.handleSelectKpi('emAndamento')}
            className={kpiActive('emAndamento')}
          />
          <KpiCard
            icon={faCircleCheck}
            title="Concluídas"
            value={tab.metricas?.concluidas ?? 0}
            subtitle="Encerradas internamente"
            tone="green"
            onClick={() => tab.handleSelectKpi('concluidas')}
            className={kpiActive('concluidas')}
          />
          <KpiCard
            icon={faCircleXmark}
            title="Canceladas"
            value={tab.metricas?.canceladas ?? 0}
            subtitle="Anuladas"
            tone="slate"
            onClick={() => tab.handleSelectKpi('canceladas')}
            className={kpiActive('canceladas')}
          />
        </KpiGrid>

        <GlobalFilterBar
          searchTerm={tab.searchTerm}
          onSearchChange={tab.onSearchChange}
          searchPlaceholder="Buscar por OS, equipamento ou problema..."
          selectFilters={tab.selectFilters}
        />

        <ActiveFiltersBar
          filters={tab.activeFilters}
          onRemove={tab.clearFilter}
          onClearAll={tab.clearAllFilters}
        />

        {tab.error || isEmpty ? (
          <PageState
            error={tab.error?.message || tab.error || ''}
            isEmpty={isEmpty}
            emptyMessage="Nenhuma ocorrência encontrada com os filtros atuais."
          />
        ) : (
          <div className="space-y-4">
            {tab.items.map((item) => (
              <OsCorretivaCard
                key={`os-${item.id}`}
                os={item}
                isAdmin={isAdmin}
                onDelete={onDeleteOs}
              />
            ))}
          </div>
        )}

        <div
          className="flex flex-col items-center justify-center gap-3 text-sm md:flex-row md:justify-between"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>
            Exibindo{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {tab.pagination.totalCarregado}
            </strong>{' '}
            de{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {tab.pagination.total ?? tab.pagination.totalCarregado}
            </strong>{' '}
            registro(s).
          </span>

          {tab.pagination.hasNextPage ? (
            <Button
              type="button"
              variant="secondary"
              onClick={tab.carregarMais}
              disabled={tab.loadingMore}
            >
              {tab.loadingMore ? 'Carregando...' : 'Carregar mais'}
            </Button>
          ) : null}
        </div>
      </div>
    </PageSection>
  );
}

OcorrenciasTab.propTypes = {
  tab: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool,
  onDeleteOs: PropTypes.func.isRequired,
};

export default OcorrenciasTab;
