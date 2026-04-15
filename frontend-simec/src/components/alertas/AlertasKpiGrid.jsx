import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCircleCheck,
  faTriangleExclamation,
  faLightbulb,
  faList,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function KpiCard({ icon, title, value, tone = 'slate', onClick }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    violet: 'bg-violet-100 text-violet-600',
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

function AlertasKpiGrid({
  metricas,
  totalRecomendacoes,
  onClearAll,
  onFilterNaoVistos,
  onFilterVistos,
  onFilterCriticos,
  onFilterRecomendacoes,
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
      <KpiCard
        icon={faList}
        title="Total"
        value={metricas.total}
        tone="slate"
        onClick={onClearAll}
      />

      <KpiCard
        icon={faBell}
        title="Não vistos"
        value={metricas.naoVistos}
        tone="blue"
        onClick={onFilterNaoVistos}
      />

      <KpiCard
        icon={faCircleCheck}
        title="Vistos"
        value={metricas.vistos}
        tone="green"
        onClick={onFilterVistos}
      />

      <KpiCard
        icon={faTriangleExclamation}
        title="Críticos"
        value={metricas.criticos}
        tone="red"
        onClick={onFilterCriticos}
      />

      <KpiCard
        icon={faLightbulb}
        title="Recomendações"
        value={totalRecomendacoes}
        tone="violet"
        onClick={onFilterRecomendacoes}
      />
    </div>
  );
}

AlertasKpiGrid.propTypes = {
  metricas: PropTypes.object.isRequired,
  totalRecomendacoes: PropTypes.number.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onFilterNaoVistos: PropTypes.func.isRequired,
  onFilterVistos: PropTypes.func.isRequired,
  onFilterCriticos: PropTypes.func.isRequired,
  onFilterRecomendacoes: PropTypes.func.isRequired,
};

export default AlertasKpiGrid;