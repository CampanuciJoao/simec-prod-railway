import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Card from '@/components/ui/primitives/Card';

const toneMap = {
  slate: {
    iconBg: 'bg-slate-100 dark:bg-slate-800/80',
    iconText: 'text-slate-600 dark:text-slate-200',
  },
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-950/50',
    iconText: 'text-blue-600 dark:text-blue-300',
  },
  green: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
    iconText: 'text-emerald-600 dark:text-emerald-300',
  },
  yellow: {
    iconBg: 'bg-amber-100 dark:bg-amber-950/50',
    iconText: 'text-amber-600 dark:text-amber-300',
  },
  orange: {
    iconBg: 'bg-amber-100 dark:bg-amber-950/50',
    iconText: 'text-amber-700 dark:text-amber-300',
  },
  red: {
    iconBg: 'bg-red-100 dark:bg-red-950/50',
    iconText: 'text-red-600 dark:text-red-300',
  },
  purple: {
    iconBg: 'bg-violet-100 dark:bg-violet-950/50',
    iconText: 'text-violet-600 dark:text-violet-300',
  },
};

function KpiCard({
  icon,
  title,
  value,
  subtitle = '',
  tone = 'slate',
  onClick,
  to,
  className = '',
}) {
  const toneClasses = toneMap[tone] || toneMap.slate;
  const isInteractive = Boolean(onClick || to);

  const content = (
    <Card
      className={[
        'h-full rounded-3xl border transition-all',
        isInteractive ? 'hover:-translate-y-0.5 hover:shadow-lg' : '',
      ].join(' ')}
      styleOverride={{
        backgroundColor: 'var(--kpi-surface)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <div className="flex h-full items-start gap-4">
        <div
          className={[
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            toneClasses.iconBg,
            toneClasses.iconText,
          ].join(' ')}
        >
          <FontAwesomeIcon icon={icon} className="text-base" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
            {value}
          </p>

          {subtitle ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={['block w-full text-left', className].join(' ')}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={['w-full text-left', className].join(' ')}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

KpiCard.propTypes = {
  icon: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  tone: PropTypes.oneOf([
    'slate',
    'blue',
    'green',
    'yellow',
    'orange',
    'red',
    'purple',
  ]),
  onClick: PropTypes.func,
  to: PropTypes.string,
  className: PropTypes.string,
};

export default KpiCard;