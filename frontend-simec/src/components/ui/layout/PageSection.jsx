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

  const headerStyle = darkHeader
    ? { backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--bg-sidebar-hover)' }
    : { borderColor: 'var(--section-header-border)' };

  return (
    <Card
      className={className}
      surface="default"
      style={{ backgroundColor: 'var(--section-surface)' }}
    >
      {hasHeader ? (
        <div
          className="mb-5 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between"
          style={headerStyle}
        >
          <div className="min-w-0">
            {title ? (
              <h2
                className="text-base font-semibold"
                style={{ color: darkHeader ? 'var(--text-sidebar)' : 'var(--text-primary)' }}
              >
                {title}
              </h2>
            ) : null}

            {description ? (
              <p
                className="mt-1 text-sm"
                style={{ color: darkHeader ? 'var(--text-sidebar-muted)' : 'var(--text-muted)', opacity: darkHeader ? 0.7 : undefined }}
              >
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
