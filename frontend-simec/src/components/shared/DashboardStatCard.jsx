import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Card from '../ui/primitives/Card';

function DashboardStatCard({
  to,
  icon,
  title,
  value,
  subtitle,
  tone = 'blue',
}) {
  const toneMap = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <Link to={to} className="block h-full">
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
              toneMap[tone] || toneMap.blue,
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

            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

DashboardStatCard.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.any.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  subtitle: PropTypes.string,
  tone: PropTypes.oneOf(['blue', 'emerald', 'amber', 'red', 'slate']),
};

export default DashboardStatCard;