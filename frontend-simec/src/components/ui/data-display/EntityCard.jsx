import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMinus,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function EntityCard({
  title = null,
  eyebrow = null,
  subtitle = null,
  expanded = false,
  onToggle,
  actions = null,
  summary = null,
  expandedContent = null,
  borderClassName = '',
  className = '',
  collapseIcon = null,
  expandIcon = null,
  compact = false,
}) {
  const resolvedExpandIcon = expandIcon || <FontAwesomeIcon icon={faPlus} />;
  const resolvedCollapseIcon = collapseIcon || <FontAwesomeIcon icon={faMinus} />;

  const hasTextHeader = Boolean(title || eyebrow || subtitle);
  const hasTopRow = hasTextHeader || actions;

  return (
    <Card
      padded={false}
      className={[
        'overflow-hidden rounded-3xl border border-l-[8px] shadow-sm transition-all',
        borderClassName,
        className,
      ].join(' ')}
      surface="default"
    >
      <button
        type="button"
        onClick={onToggle}
        className={[
          'flex w-full text-left',
          compact
            ? 'items-center gap-4 px-4 py-4 md:px-5'
            : 'flex-col gap-5 px-5 py-5 lg:flex-row lg:items-start lg:justify-between',
        ].join(' ')}
      >
        <div
          className={[
            'inline-flex shrink-0 items-center justify-center rounded-2xl border',
            compact ? 'h-10 w-10 self-center' : 'h-11 w-11',
          ].join(' ')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-soft)',
            color: 'var(--brand-primary)',
          }}
        >
          {expanded ? resolvedCollapseIcon : resolvedExpandIcon}
        </div>

        <div className="min-w-0 flex-1">
          {hasTopRow ? (
            <div
              className={[
                'min-w-0',
                compact
                  ? 'mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'
                  : 'flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between',
              ].join(' ')}
            >
              {hasTextHeader ? (
                <div className="min-w-0">
                  {eyebrow ? (
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {eyebrow}
                    </div>
                  ) : null}

                  {title ? (
                    <h3
                      className="mt-1 break-words text-lg font-bold sm:text-xl"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {title}
                    </h3>
                  ) : null}

                  {subtitle ? (
                    <p
                      className="mt-1 text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div />
              )}

              {actions ? (
                <div
                  className="flex shrink-0 items-center gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}

          {summary}
        </div>
      </button>

      {expanded ? (
        <div
          style={{
            borderTop: '1px solid var(--border-soft)',
            backgroundColor: 'var(--bg-surface-soft)',
          }}
        >
          {expandedContent}
        </div>
      ) : null}
    </Card>
  );
}

EntityCard.propTypes = {
  title: PropTypes.node,
  eyebrow: PropTypes.node,
  subtitle: PropTypes.node,
  expanded: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  actions: PropTypes.node,
  summary: PropTypes.node,
  expandedContent: PropTypes.node,
  borderClassName: PropTypes.string,
  className: PropTypes.string,
  collapseIcon: PropTypes.node,
  expandIcon: PropTypes.node,
  compact: PropTypes.bool,
};

export default EntityCard;