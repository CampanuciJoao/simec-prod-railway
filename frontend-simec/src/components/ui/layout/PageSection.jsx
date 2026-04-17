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
    <Card className={className} surface="default">
      {hasHeader ? (
        <div
          className="mb-5 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between"
          style={{ borderColor: 'var(--section-header-border)' }}
        >
          <div className="min-w-0">
            {title ? (
              <h2 className="ui-text-primary text-base font-semibold">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="ui-text-muted mt-1 text-sm">
                {description}
              </p>
            ) : null}
          </div>

          {headerRight ? (
            <div className="shrink-0">{headerRight}</div>
          ) : null}
        </div>
      ) : null}

      <div>{children}</div>
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