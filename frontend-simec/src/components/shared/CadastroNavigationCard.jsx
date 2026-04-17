import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Card } from '@/components/ui';

const toneStyleMap = {
  blue: {
    iconBg: 'var(--brand-primary-soft)',
    iconText: 'var(--brand-primary)',
  },
  green: {
    iconBg: 'var(--color-success-soft)',
    iconText: 'var(--color-success)',
  },
  yellow: {
    iconBg: 'var(--color-warning-soft)',
    iconText: 'var(--color-warning)',
  },
  slate: {
    iconBg: 'var(--bg-surface-subtle)',
    iconText: 'var(--text-secondary)',
  },
  red: {
    iconBg: 'var(--color-danger-soft)',
    iconText: 'var(--color-danger)',
  },
};

function CadastroNavigationCard({
  icon,
  title,
  description,
  onClick,
  tone = 'blue',
  className = '',
}) {
  const toneStyle = toneStyleMap[tone] || toneStyleMap.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left transition hover:-translate-y-0.5',
        className,
      ].join(' ')}
    >
      <Card
        className="h-full rounded-3xl"
        surface="default"
        styleOverride={{
          backgroundColor: 'var(--section-surface)',
          borderColor: 'var(--border-soft)',
        }}
      >
        <div className="flex h-full flex-col gap-4">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: toneStyle.iconBg,
              color: toneStyle.iconText,
            }}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div className="min-w-0">
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>

            <p
              className="mt-1 text-sm leading-6"
              style={{ color: 'var(--text-muted)' }}
            >
              {description}
            </p>
          </div>
        </div>
      </Card>
    </button>
  );
}

CadastroNavigationCard.propTypes = {
  icon: PropTypes.any.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  tone: PropTypes.oneOf(['blue', 'green', 'yellow', 'slate', 'red']),
  className: PropTypes.string,
};

export default CadastroNavigationCard;