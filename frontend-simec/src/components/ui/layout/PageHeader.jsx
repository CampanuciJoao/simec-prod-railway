import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className = '',
}) {
  return (
    <div
      className={[
        'ui-surface ui-shadow-sm ui-transition rounded-3xl border px-5 py-5 sm:px-6 sm:py-6',
        className,
      ].join(' ')}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {icon ? (
            <div
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary)',
              }}
            >
              <FontAwesomeIcon icon={icon} />
            </div>
          ) : null}

          <div className="min-w-0">
            <h1 className="ui-text-primary text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>

            {subtitle ? (
              <p className="ui-text-muted mt-1 text-sm sm:text-base">
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
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.object,
  actions: PropTypes.node,
  className: PropTypes.string,
};

export default PageHeader;