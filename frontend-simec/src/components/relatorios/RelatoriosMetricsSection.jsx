import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartColumn,
  faFileLines,
  faIndustry,
  faBuilding,
} from '@fortawesome/free-solid-svg-icons';

import Card from '../ui/Card';
import ResponsiveGrid from '../ui/ResponsiveGrid';

function MetricCard({ icon, title, value, tone = 'slate' }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
  };

  return (
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
  );
}

MetricCard.propTypes = {
  icon: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tone: PropTypes.oneOf(['slate', 'blue', 'green', 'yellow']),
};

function RelatoriosMetricsSection({ metricas }) {
  return (
    <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
      <MetricCard
        icon={faFileLines}
        title="Tipo atual"
        value={metricas.tipoAtual}
        tone="blue"
      />

      <MetricCard
        icon={faBuilding}
        title="Unidades"
        value={metricas.unidades}
        tone="green"
      />

      <MetricCard
        icon={faIndustry}
        title="Fabricantes"
        value={metricas.fabricantes}
        tone="yellow"
      />

      <MetricCard
        icon={faChartColumn}
        title="Registros"
        value={metricas.registros}
        tone="slate"
      />
    </ResponsiveGrid>
  );
}

RelatoriosMetricsSection.propTypes = {
  metricas: PropTypes.shape({
    tipoAtual: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    unidades: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    fabricantes: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    registros: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
};

export default RelatoriosMetricsSection;