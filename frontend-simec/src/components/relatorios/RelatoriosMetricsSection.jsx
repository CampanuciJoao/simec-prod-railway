import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartColumn,
  faFileLines,
  faCalendarCheck,
  faBuilding,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function MetricCard({ icon, label, value }) {
  return (
    <Card className="h-full">
      <div className="flex items-center gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <FontAwesomeIcon icon={icon} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

MetricCard.propTypes = {
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

function RelatoriosMetricsSection({ metricas }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={faChartColumn}
        label="Relatórios gerados"
        value={metricas?.totalRelatorios || 0}
      />

      <MetricCard
        icon={faFileLines}
        label="Itens retornados"
        value={metricas?.totalItens || 0}
      />

      <MetricCard
        icon={faCalendarCheck}
        label="Períodos filtrados"
        value={metricas?.periodosAplicados || 0}
      />

      <MetricCard
        icon={faBuilding}
        label="Unidades filtradas"
        value={metricas?.unidadesFiltradas || 0}
      />
    </div>
  );
}

RelatoriosMetricsSection.propTypes = {
  metricas: PropTypes.object,
};

export default RelatoriosMetricsSection;