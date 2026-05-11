import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Card from '@/components/ui/primitives/Card';

/**
 * KpiCard — padrão visual do app.
 *
 * Estética tech adotada como padrão (aprovada após iteração no Dashboard):
 * - Faixa colorida 2px no topo (gradiente sutil) — sinaliza tone.
 * - Eyebrow do título em monospace uppercase com tracking.
 * - Valor grande em mono tabular (.stat-value).
 * - Ícone num quadrado tonal compacto.
 * - Background tonal sutil por tone.
 * - Code opcional (ex.: K01, K02) em monospace no canto direito.
 */
const toneStyleMap = {
  slate: {
    accent:   'var(--text-secondary)',
    cardBg:   'var(--kpi-surface)',
    iconBg:   'var(--bg-surface-subtle)',
    iconText: 'var(--text-secondary)',
  },
  blue: {
    accent:   'var(--brand-primary)',
    cardBg:   'var(--brand-primary-surface)',
    iconBg:   'var(--brand-primary-soft)',
    iconText: 'var(--brand-primary)',
  },
  green: {
    accent:   'var(--color-success)',
    cardBg:   'var(--color-success-surface)',
    iconBg:   'var(--color-success-soft)',
    iconText: 'var(--color-success)',
  },
  yellow: {
    accent:   'var(--color-warning)',
    cardBg:   'var(--color-warning-surface)',
    iconBg:   'var(--color-warning-soft)',
    iconText: 'var(--color-warning)',
  },
  orange: {
    accent:   'var(--color-warning)',
    cardBg:   'var(--color-warning-surface)',
    iconBg:   'var(--color-warning-soft)',
    iconText: 'var(--color-warning)',
  },
  red: {
    accent:   'var(--color-danger)',
    cardBg:   'var(--color-danger-surface)',
    iconBg:   'var(--color-danger-soft)',
    iconText: 'var(--color-danger)',
  },
  purple: {
    accent:   'var(--color-info)',
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
  code,
  onClick,
  to,
  className = '',
}) {
  const toneStyle = toneStyleMap[tone] || toneStyleMap.slate;
  const isInteractive = Boolean(onClick || to);

  const content = (
    <Card
      className={['relative h-full rounded-2xl overflow-hidden', className].join(' ')}
      interactive={isInteractive}
      style={{
        backgroundColor: toneStyle.cardBg,
        borderColor: 'var(--border-soft)',
      }}
    >
      {/* Faixa colorida superior — sinaliza tone */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${toneStyle.accent}, transparent)`,
          opacity: 0.75,
          pointerEvents: 'none',
        }}
      />

      <div className="flex h-full items-start gap-4">
        <div
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: toneStyle.iconBg,
            color: toneStyle.iconText,
          }}
        >
          <FontAwesomeIcon icon={icon} className="text-base" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {title}
            </p>
            {code && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: 'var(--text-muted)',
                  opacity: 0.7,
                }}
              >
                {code}
              </span>
            )}
          </div>

          <p
            className="stat-value mt-1.5 text-3xl font-semibold leading-none"
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
  code: PropTypes.string,
  onClick: PropTypes.func,
  to: PropTypes.string,
  className: PropTypes.string,
};

export default KpiCard;
