import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

function AppBreadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? 'font-semibold text-slate-900 dark:text-slate-100'
                      : ''
                  }
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span className="mx-1 text-slate-400">/</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}

AppBreadcrumb.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string,
    })
  ),
};

export default AppBreadcrumb;