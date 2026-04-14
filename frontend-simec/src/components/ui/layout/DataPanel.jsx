import React from 'react';
import PropTypes from 'prop-types';

function DataPanel({
  title = '',
  subtitle = '',
  children,
  className = '',
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm',
        className,
      ].join(' ')}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title ? (
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
              {title}
            </h3>
          ) : null}

          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      )}

      {children}
    </div>
  );
}

DataPanel.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default DataPanel;