import React from 'react';
import PropTypes from 'prop-types';

import Card from '@/components/ui/primitives/Card';

function PageSection({
  title,
  description,
  headerRight,
  actions,
  children,
  className = '',
  darkHeader = false,
}) {
  const resolvedHeaderRight = actions || headerRight;
  const hasHeader = title || description || resolvedHeaderRight;

  if (darkHeader) {
    return (
      <div
        className={['rounded-2xl border overflow-hidden', className].join(' ')}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {hasHeader ? (
          <div
            className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: 'var(--bg-sidebar)' }}
          >
            <div className="min-w-0">
              {title ? (
                <h2 className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-sidebar)' }}>
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--text-sidebar-muted)', opacity: 0.65 }}>
                  {description}
                </p>
              ) : null}
            </div>
            {resolvedHeaderRight ? (
              <div className="page-section-dark-actions shrink-0">{resolvedHeaderRight}</div>
            ) : null}
          </div>
        ) : null}
        <div className="p-4 md:p-5">{children}</div>
      </div>
    );
  }

  return (
    <Card
      className={className}
      surface="default"
      style={{ backgroundColor: 'var(--section-surface)' }}
    >
      {hasHeader ? (
        <div
          className="mb-5 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between"
          style={{ borderColor: 'var(--section-header-border)' }}
        >
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            ) : null}
          </div>
          {resolvedHeaderRight ? (
            <div className="shrink-0">{resolvedHeaderRight}</div>
          ) : null}
        </div>
      ) : null}
      <div>{children}</div>
    </Card>
  );
}

PageSection.propTypes = {
  title: PropTypes.node,
  description: PropTypes.node,
  headerRight: PropTypes.node,
  actions: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
  darkHeader: PropTypes.bool,
};

export default PageSection;
