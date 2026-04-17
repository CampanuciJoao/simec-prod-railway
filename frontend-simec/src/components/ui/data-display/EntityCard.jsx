import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMinus,
} from '@fortawesome/free-solid-svg-icons';

import Card from '@/components/ui/primitives/Card';

function EntityCard({
  title,
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
}) {
  const resolvedExpandIcon = expandIcon || <FontAwesomeIcon icon={faPlus} />;
  const resolvedCollapseIcon = collapseIcon || <FontAwesomeIcon icon={faMinus} />;

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
        className="flex w-full flex-col gap-5 px-5 py-5 text-left lg:flex-row lg:items-start lg:justify-between"
      >
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-600">
            {expanded ? resolvedCollapseIcon : resolvedExpandIcon}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                {eyebrow ? (
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {eyebrow}
                  </div>
                ) : null}

                <h3 className="mt-1 break-words text-lg font-bold text-slate-900 sm:text-xl">
                  {title}
                </h3>

                {subtitle ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {actions ? (
                <div
                  className="flex shrink-0 items-center gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  {actions}
                </div>
              ) : null}
            </div>

            {summary}
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 bg-slate-50">
          {expandedContent}
        </div>
      ) : null}
    </Card>
  );
}

EntityCard.propTypes = {
  title: PropTypes.node.isRequired,
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
};

export default EntityCard;