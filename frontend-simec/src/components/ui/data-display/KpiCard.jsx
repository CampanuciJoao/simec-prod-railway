import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Card from '@/components/ui/primitives/Card';

const toneStyleMap = {
  slate: {
    cardBg:   'var(--kpi-surface)',
    iconBg:   'var(--bg-surface-subtle)',
    iconText: 'var(--text-secondary)',
  },
  blue: {
    cardBg:   'var(--brand-primary-surface)',
    iconBg:   'var(--brand-primary-soft)',
    iconText: 'var(--brand-primary)',
  },
  green: {
    cardBg:   'var(--color-success-surface)',
    iconBg:   'var(--color-success-soft)',
    iconText: 'var(--color-success)',
  },
  yellow: {
    cardBg:   'var(--color-warning-surface)',
    iconBg:   'var(--color-warning-soft)',
    iconText: 'var(--color-warning)',
  },
  orange: {
    cardBg:   'var(--color-warning-surface)',
    iconBg:   'var(--color-warning-soft)',
    iconText: 'var(--color-warning)',
  },
  red: {
    cardBg:   'var(--color-danger-surface)',
    iconBg:   'var(--color-danger-soft)',
    iconText: 'var(--color-danger)',
  },
  purple: {
    cardBg:   'var(--color-info-surface)',
    iconBg:   'var(--color-info-soft)',
    iconText: 'var(--color-info)',
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
      className={['h-full rounded-3xl', className].join(' ')}
      interactive={isInteractive}
      style={{
        backgroundColor: toneStyle.cardBg,
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
            className="text-[10.5px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--text-muted)' }}
          >
            {title}
          </p>

          <p
            className="stat-value mt-2 text-3xl font-semibold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>

          {subtitle ? (
            <p
              className="mt-2 line-clamp-2 text-sm leading-snug"
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
      <Link to={to} className="block w-full text-left">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

KpiCard.propTypes = {
  icon: PropTypes.object.isRequired,
  title: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
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
