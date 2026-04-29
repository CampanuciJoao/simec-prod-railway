import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function ExpandableTimelineItem({
  title,
  badge = null,
  meta = null,
  icon,
  iconClassName = '',
  borderClassName = '',
  expanded = false,
  onToggle,
  children,
  className = '',
  actions = null,
}) {
  return (
    <Card
      padded={false}
      className={[
        'overflow-hidden rounded-3xl border border-l-[8px]',
        borderClassName,
        className,
      ].join(' ')}
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="flex items-stretch"
        style={{
          backgroundColor: expanded ? 'var(--bg-surface-soft)' : 'var(--bg-surface)',
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-4 text-left transition"
        >
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={[
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                iconClassName,
              ].join(' ')}
            >
              {icon}
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4
                  className="text-sm font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {title}
                </h4>

                {badge}
              </div>

              {meta ? (
                <div
                  className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {meta}
                </div>
              ) : null}
            </div>
          </div>

          <span className="shrink-0 pt-1" style={{ color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
          </span>
        </button>

        {actions ? (
          <div
            className="flex shrink-0 items-center border-l px-4"
            style={{ borderColor: 'var(--border-soft)' }}
          >
            {actions}
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div
          className="border-t px-5 py-5"
          style={{
            borderColor: 'var(--border-soft)',
            backgroundColor: 'var(--bg-surface-soft)',
          }}
        >
          {children}
        </div>
      ) : null}
    </Card>
  );
}

ExpandableTimelineItem.propTypes = {
  title: PropTypes.node.isRequired,
  badge: PropTypes.node,
  meta: PropTypes.node,
  icon: PropTypes.node.isRequired,
  iconClassName: PropTypes.string,
  borderClassName: PropTypes.string,
  expanded: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
  actions: PropTypes.node,
};

export default ExpandableTimelineItem;
