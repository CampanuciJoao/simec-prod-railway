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
  cardStyle = {},
  toggleStyle = {},
  expandedStyle = {},
}) {
  const resolvedExpandIcon = expandIcon || <FontAwesomeIcon icon={faPlus} />;
  const resolvedCollapseIcon = collapseIcon || <FontAwesomeIcon icon={faMinus} />;

  const hasTextHeader = Boolean(title || eyebrow || subtitle);
  const hasTopRow = hasTextHeader || actions;

  const defaultToggleStyle = {
    backgroundColor: 'var(--bg-surface)',
    borderColor: 'var(--border-soft)',
    color: 'var(--brand-primary)',
  };

  function renderHeaderText() {
    if (!hasTextHeader) return null;

    return (
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
    );
  }

  return (
    <Card
      padded={false}
      className={[
        'overflow-hidden rounded-3xl border border-l-[8px] shadow-sm transition-all',
        borderClassName,
        className,
      ].join(' ')}
      surface="default"
      style={cardStyle}
    >
      {compact ? (
        <div className="px-4 py-4 md:px-5">
          <div className="flex items-center justify-between gap-3 md:hidden">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm transition-all"
              style={{
                ...defaultToggleStyle,
                ...toggleStyle,
              }}
            >
              {expanded ? resolvedCollapseIcon : resolvedExpandIcon}
            </button>

            {actions ? (
              <div className="flex shrink-0 items-center gap-2">
                {actions}
              </div>
            ) : null}
          </div>

          <div className={summary ? 'mt-3 md:mt-0' : ''}>
            <div className="hidden md:flex md:items-center md:gap-3">
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-xl border text-sm transition-all"
                style={{
                  ...defaultToggleStyle,
                  ...toggleStyle,
                }}
              >
                {expanded ? resolvedCollapseIcon : resolvedExpandIcon}
              </button>

              <div className="min-w-0 flex-1">
                {summary}
              </div>

              {actions ? (
                <div className="flex shrink-0 items-center gap-2 self-center">
                  {actions}
                </div>
              ) : null}
            </div>

            <div className="md:hidden">
              {hasTextHeader ? (
                <div className="mb-3 min-w-0">
                  {renderHeaderText()}
                </div>
              ) : null}

              {summary}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-5 px-5 py-5 text-left lg:flex-row lg:items-start lg:justify-between">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Recolher card' : 'Expandir card'}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all"
            style={{
              ...defaultToggleStyle,
              ...toggleStyle,
            }}
          >
            {expanded ? resolvedCollapseIcon : resolvedExpandIcon}
          </button>

          <div className="min-w-0 flex-1">
            {hasTopRow ? (
              <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                {renderHeaderText()}

                {actions ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {actions}
                  </div>
                ) : null}
              </div>
            ) : null}

            {summary}
          </div>
        </div>
      )}

      {expanded ? (
        <div
          style={{
            borderTop: '1px solid var(--border-soft)',
            backgroundColor: 'var(--bg-surface-soft)',
            ...expandedStyle,
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
  cardStyle: PropTypes.object,
  toggleStyle: PropTypes.object,
  expandedStyle: PropTypes.object,
};

export default EntityCard;
