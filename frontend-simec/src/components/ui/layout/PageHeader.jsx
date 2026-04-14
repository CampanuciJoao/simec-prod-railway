import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function PageHeader({
  title,
  subtitle = '',
  icon = null,
  actions = null,
  variant = 'default',
  className = '',
}) {
  const variantClass =
    variant === 'light'
      ? 'bg-white border border-slate-200 shadow-sm'
      : 'bg-white border border-slate-200 shadow-sm';

  return (
    <header
      className={[
        'mb-6 rounded-2xl p-4 sm:p-5 lg:p-6',
        variantClass,
        className,
      ].join(' ')}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {icon ? (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm">
              <FontAwesomeIcon icon={icon} />
            </span>
          ) : null}

          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.any,
  actions: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'light']),
  className: PropTypes.string,
};

export default PageHeader;