import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Card from '@/components/ui/primitives/Card';

const toneStyleMap = {
  slate: {
    iconBg: 'var(--bg-surface-subtle)',
    iconText: '#64748b',
  },
  blue: {
    iconBg: 'rgba(37, 99, 235, 0.14)',
    iconText: '#3b82f6',
  },
  green: {
    iconBg: 'rgba(5, 150, 105, 0.14)',
    iconText: '#34d399',
  },
  yellow: {
    iconBg: 'rgba(217, 119, 6, 0.16)',
    iconText: '#fbbf24',
  },
  orange: {
    iconBg: 'rgba(234, 88, 12, 0.16)',
    iconText: '#fb923c',
  },
  red: {
    iconBg: 'rgba(220, 38, 38, 0.14)',
    iconText: '#f87171',
  },
  purple: {
    iconBg: 'rgba(139, 92, 246, 0.14)',
    iconText: '#a78bfa',
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
  const toneStyle = toneStyleMap[tone] || toneStyleMap.slate;
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
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: toneStyle.iconBg,
            color: toneStyle.iconText,
          }}
        >
          <FontAwesomeIcon icon={icon} className="text-base" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--text-muted)' }}
          >
            {title}
          </p>

          <p
            className="mt-2 text-3xl font-bold leading-none tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>

          {subtitle ? (
            <p
              className="mt-2 line-clamp-2 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
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