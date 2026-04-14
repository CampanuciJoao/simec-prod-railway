import React from 'react';
import PropTypes from 'prop-types';

function PageSection({
  title = '',
  description = '',
  children,
  className = '',
  contentClassName = '',
  headerRight = null,
}) {
  return (
    <section
      className={[
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6',
        className,
      ].join(' ')}
    >
      {(title || description || headerRight) && (
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>

          {headerRight ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {headerRight}
            </div>
          ) : null}
        </div>
      )}

      <div className={contentClassName}>{children}</div>
    </section>
  );
}

PageSection.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
  headerRight: PropTypes.node,
};

export default PageSection;