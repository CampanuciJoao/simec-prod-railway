import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileContract,
  faClockRotateLeft,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function KpiCard({ icon, title, value, tone = 'slate', onClick }) {
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
              tone === 'blue'
                ? 'bg-blue-100 text-blue-600'
                : tone === 'green'
                  ? 'bg-emerald-100 text-emerald-600'
                  : tone === 'yellow'
                    ? 'bg-amber-100 text-amber-600'
                    : tone === 'red'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-100 text-slate-600',
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
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  tone: PropTypes.string,
  onClick: PropTypes.func,
};

function ContratosKpiSection({ metricas, clearAllFilters, filtrarPorStatus }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={faFileContract}
        title="Total"
        value={metricas.total}
        tone="blue"
        onClick={clearAllFilters}
      />

      <KpiCard
        icon={faFileContract}
        title="Ativos"
        value={metricas.ativos}
        tone="green"
        onClick={() => filtrarPorStatus('Ativo')}
      />

      <KpiCard
        icon={faClockRotateLeft}
        title="Vencendo"
        value={metricas.vencendo}
        tone="yellow"
        onClick={() => filtrarPorStatus('Vence em breve')}
      />

      <KpiCard
        icon={faTriangleExclamation}
        title="Expirados"
        value={metricas.expirados}
        tone="red"
        onClick={() => filtrarPorStatus('Expirado')}
      />
    </div>
  );
}

ContratosKpiSection.propTypes = {
  metricas: PropTypes.object.isRequired,
  clearAllFilters: PropTypes.func.isRequired,
  filtrarPorStatus: PropTypes.func.isRequired,
};

export default ContratosKpiSection;