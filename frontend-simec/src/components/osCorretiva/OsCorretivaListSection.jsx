import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faWrench, faHourglass, faTruck, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { GlobalFilterBar, ActiveFiltersBar, KpiCard, KpiGrid, Button, PageSection } from '@/components/ui';
import OsCorretivaCard from './OsCorretivaCard';

function OsCorretivaListSection({
  osCorretivas, searchTerm, onSearchChange, selectFilters, activeFilters,
  onRemoveFilter, onClearAll, onDelete, isAdmin, metricas, total,
  hasNextPage, loadingMore, onLoadMore,
}) {
  return (
    <PageSection>
      <KpiGrid>
        <KpiCard icon={faFolderOpen} title="Total" value={metricas?.total ?? 0} />
        <KpiCard icon={faWrench} title="Abertas" value={metricas?.abertas ?? 0} />
        <KpiCard icon={faHourglass} title="Em andamento" value={metricas?.emAndamento ?? 0} />
        <KpiCard icon={faTruck} title="Aguardando terceiro" value={metricas?.aguardandoTerceiro ?? 0} />
        <KpiCard icon={faCheckCircle} title="Concluídas" value={metricas?.concluidas ?? 0} />
      </KpiGrid>

      <GlobalFilterBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por OS, equipamento, solicitante..."
        selectFilters={selectFilters}
        onFilterChange={(key, val) => {
          const cfg = selectFilters[key];
          if (cfg) cfg.onChange?.(val);
        }}
      />

      {activeFilters.length > 0 && (
        <ActiveFiltersBar filters={activeFilters} onRemove={onRemoveFilter} onClearAll={onClearAll} />
      )}

      <div className="space-y-4">
        {osCorretivas.map((os) => (
          <OsCorretivaCard
            key={os.id}
            os={os}
            isAdmin={isAdmin}
            onDelete={onDelete}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button type="button" variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </PageSection>
  );
}

OsCorretivaListSection.propTypes = {
  osCorretivas: PropTypes.array.isRequired,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  selectFilters: PropTypes.object,
  activeFilters: PropTypes.array,
  onRemoveFilter: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
  metricas: PropTypes.object,
  total: PropTypes.number,
  hasNextPage: PropTypes.bool,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

OsCorretivaListSection.defaultProps = {
  searchTerm: '',
  selectFilters: {},
  activeFilters: [],
  isAdmin: false,
  metricas: {},
  total: 0,
  hasNextPage: false,
  loadingMore: false,
  onLoadMore: () => {},
};

export default OsCorretivaListSection;
