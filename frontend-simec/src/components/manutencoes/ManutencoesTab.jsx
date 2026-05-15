import React from 'react';
import PropTypes from 'prop-types';
import {
  faCalendarCheck,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faPersonRunning,
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

import { ManutencaoCard } from '@/components/manutencoes';
import OsCorretivaCard from '@/components/osCorretiva/OsCorretivaCard';

/**
 * Aba "Manutenções" da página de Gerenciamento.
 * Mostra Manutencao (qualquer tipo) + OsCorretiva tipo='Corretiva'.
 */
function ManutencoesTab({ tab, isAdmin, onDeleteManutencao, onDeleteOs }) {
  const kpiActive = (key) =>
    tab.activeKpi === key ? 'ring-2 ring-offset-2 ring-offset-transparent' : '';

  if (tab.loading) {
    return <SkeletonList rows={6} cols={5} />;
  }

  const isEmpty = !tab.loading && !tab.error && tab.items.length === 0;
  if (tab.error || isEmpty) {
    return (
      <PageState
        error={tab.error?.message || tab.error || ''}
        isEmpty={isEmpty}
        emptyMessage="Nenhuma manutenção encontrada."
      />
    );
  }

  return (
    <PageSection>
      <div className="space-y-6">
        <KpiGrid cols={5}>
          <KpiCard
            icon={faClock}
            title="Total"
            value={tab.metricas?.total ?? 0}
            subtitle="Todas as manutenções"
            tone="slate"
            onClick={() => tab.handleSelectKpi('total')}
            className={kpiActive('total')}
          />
          <KpiCard
            icon={faCalendarCheck}
            title="Agendadas"
            value={tab.metricas?.agendadas ?? 0}
            subtitle="Aguardando execução"
            tone="blue"
            onClick={() => tab.handleSelectKpi('agendadas')}
            className={kpiActive('agendadas')}
          />
          <KpiCard
            icon={faPersonRunning}
            title="Em andamento"
            value={tab.metricas?.emAndamento ?? 0}
            subtitle="Sendo executadas"
            tone="orange"
            onClick={() => tab.handleSelectKpi('emAndamento')}
            className={kpiActive('emAndamento')}
          />
          <KpiCard
            icon={faCircleCheck}
            title="Concluídas"
            value={tab.metricas?.concluidas ?? 0}
            subtitle="Finalizadas com sucesso"
            tone="green"
            onClick={() => tab.handleSelectKpi('concluidas')}
            className={kpiActive('concluidas')}
          />
          <KpiCard
            icon={faCircleXmark}
            title="Canceladas"
            value={tab.metricas?.canceladas ?? 0}
            subtitle="Ordens encerradas"
            tone="slate"
            onClick={() => tab.handleSelectKpi('canceladas')}
            className={kpiActive('canceladas')}
          />
        </KpiGrid>

        <GlobalFilterBar
          searchTerm={tab.searchTerm}
          onSearchChange={tab.onSearchChange}
          searchPlaceholder="Buscar por OS, equipamento, unidade ou descrição..."
          selectFilters={tab.selectFilters}
        />

        <ActiveFiltersBar
          filters={tab.activeFilters}
          onRemove={tab.clearFilter}
          onClearAll={tab.clearAllFilters}
        />

        <div className="space-y-4">
          {tab.items.map((item) =>
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
                onDelete={onDeleteManutencao}
              />
            )
          )}
        </div>

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

ManutencoesTab.propTypes = {
  tab: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool,
  onDeleteManutencao: PropTypes.func.isRequired,
  onDeleteOs: PropTypes.func.isRequired,
};

export default ManutencoesTab;
