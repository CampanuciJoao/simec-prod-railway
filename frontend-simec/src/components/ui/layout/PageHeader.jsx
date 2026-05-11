import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Card from '@/components/ui/primitives/Card';

/**
 * Page header padrão do app.
 *
 * Acréscimos sobre o original:
 * - Faixa colorida 2px no topo (gradiente sutil em --brand-primary) —
 *   alinha visualmente com KpiCard e cria coerência entre header e KPIs.
 * - Eyebrow monospace uppercase ("/ TITULO") acima do título —
 *   contexto técnico discreto. Pode ser sobrescrita via prop `eyebrow`.
 * - Padding vertical reduzido — header mais enxuto.
 */
function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  eyebrow,
  className = '',
}) {
  // Deriva eyebrow do title quando não passada explicitamente
  const eyebrowText = eyebrow != null
    ? eyebrow
    : (typeof title === 'string' ? `/ ${title.toUpperCase()}` : null);

  return (
    <Card
      className={[
        'relative overflow-hidden rounded-3xl px-5 py-4 sm:px-6 sm:py-5',
        className,
      ].join(' ')}
      surface="default"
      padded={false}
      style={{
        background: 'var(--header-surface)',
        borderColor: 'var(--border-soft)',
      }}
    >
      {/* Faixa colorida superior — coerência visual com KpiCard */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--brand-primary), transparent)',
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {icon ? (
            <div
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: 'var(--brand-primary-surface-strong)',
                color: 'var(--brand-primary)',
              }}
            >
              <FontAwesomeIcon icon={icon} />
            </div>
          ) : null}

          <div className="min-w-0">
            {eyebrowText && (
              <p
                className="truncate"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  color: 'var(--text-brand-surface-muted)',
                  opacity: 0.72,
                  marginBottom: 4,
                }}
                title={typeof eyebrowText === 'string' ? eyebrowText : undefined}
              >
                {eyebrowText}
              </p>
            )}
            <h1
              className="text-2xl font-semibold tracking-[-0.02em] sm:text-[26px] leading-tight"
              style={{ color: 'var(--text-brand-surface)' }}
            >
              {title}
            </h1>

            {subtitle ? (
              <p
                className="mt-1.5 text-sm leading-relaxed sm:text-[14.5px]"
                style={{ color: 'var(--text-brand-surface-muted)' }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

PageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  icon: PropTypes.object,
  actions: PropTypes.node,
  eyebrow: PropTypes.node,
  className: PropTypes.string,
};

export default PageHeader;
