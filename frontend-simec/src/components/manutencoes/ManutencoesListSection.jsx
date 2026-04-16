import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import {
  Card,
  PageSection,
  ResponsiveGrid,
} from '@/components/ui';

import GlobalFilterBar from '@/components/ui/filters/GlobalFilterBar';
import ManutencaoCard from '@/components/manutencoes/ManutencaoCard';

function ActiveFilters({ filters, onRemove, onClearAll }) {
  if (!filters?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={`${filter.key}-${filter.value || filter.label}`}
          type="button"
          onClick={() => onRemove(filter.key)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {filter.label} ✕
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-blue-600 hover:underline"
      >
        Limpar tudo
      </button>
    </div>
  );
}

ActiveFilters.propTypes = {
  filters: PropTypes.array,
  onRemove: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
};

function KPI({ icon, label, value, onClick }) {
  const content = (
    <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <FontAwesomeIcon icon={icon} />
        </span>

        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

KPI.propTypes = {
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClick: PropTypes.func,
};

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
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
          <KPI
            icon={faClock}
            label="Total"
            value={metricas?.total ?? 0}
            onClick={onClearAll}
          />

          <KPI
            icon={faTriangleExclamation}
            label="Aguardando"
            value={metricas?.aguardando ?? 0}
          />

          <KPI
            icon={faCircleCheck}
            label="Concluídas"
            value={metricas?.concluidas ?? 0}
          />

          <KPI
            icon={faCircleXmark}
            label="Canceladas"
            value={metricas?.canceladas ?? 0}
          />
        </ResponsiveGrid>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <GlobalFilterBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            searchPlaceholder="Buscar por OS, equipamento, unidade ou descrição..."
            selectFilters={selectFilters}
          />
        </div>

        <ActiveFilters
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