import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrochip,
  faCircleCheck,
  faTriangleExclamation,
  faCircleXmark,
  faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

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

KpiCard.propTypes = {
  icon: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tone: PropTypes.oneOf(['slate', 'green', 'yellow', 'red', 'blue']),
  onClick: PropTypes.func,
};

function EquipamentosKpiGrid({ metricas, onClearAllFilters, onFilterStatus }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        icon={faMicrochip}
        title="Total"
        value={metricas.total}
        tone="slate"
        onClick={onClearAllFilters}
      />

      <KpiCard
        icon={faCircleCheck}
        title="Operantes"
        value={metricas.operantes}
        tone="green"
        onClick={() => onFilterStatus('Operante')}
      />

      <KpiCard
        icon={faScrewdriverWrench}
        title="Em manutenção"
        value={metricas.emManutencao}
        tone="yellow"
        onClick={() => onFilterStatus('EmManutencao')}
      />

      <KpiCard
        icon={faCircleXmark}
        title="Inoperantes"
        value={metricas.inoperantes}
        tone="red"
        onClick={() => onFilterStatus('Inoperante')}
      />

      <KpiCard
        icon={faTriangleExclamation}
        title="Uso limitado"
        value={metricas.usoLimitado}
        tone="blue"
        onClick={() => onFilterStatus('UsoLimitado')}
      />
    </div>
  );
}

EquipamentosKpiGrid.propTypes = {
  metricas: PropTypes.shape({
    total: PropTypes.number,
    operantes: PropTypes.number,
    emManutencao: PropTypes.number,
    inoperantes: PropTypes.number,
    usoLimitado: PropTypes.number,
  }).isRequired,
  onClearAllFilters: PropTypes.func.isRequired,
  onFilterStatus: PropTypes.func.isRequired,
};

export default EquipamentosKpiGrid;