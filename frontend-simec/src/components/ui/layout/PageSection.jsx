import React from 'react';
import PropTypes from 'prop-types';

import Card from '@/components/ui/primitives/Card';

function PageSection({
  title,
  description,
  headerRight,
  children,
  className = '',
}) {
  const hasHeader = title || description || headerRight;

  return (
    <Card
      className={['rounded-3xl', className].join(' ')}
      surface="default"
      styleOverride={{
        backgroundColor: 'var(--section-surface)',
        borderColor: 'var(--border-soft)',
      }}
    >
      {hasHeader ? (
        <div
          className="mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between"
          style={{ borderColor: 'var(--section-header-border)' }}
        >
          <div className="min-w-0">
            {title ? (
              <h2
                className="text-lg font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h2>
            ) : null}

            {description ? (
              <p
                className="mt-1.5 text-sm leading-6"
                style={{ color: 'var(--text-muted)' }}
              >
                {description}
              </p>
            ) : null}
          </div>

          {headerRight ? (
            <div className="shrink-0 sm:pl-4">{headerRight}</div>
          ) : null}
        </div>
      ) : null}

      <div className="min-w-0">{children}</div>
    </Card>
  );
}

PageSection.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  headerRight: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default PageSection;