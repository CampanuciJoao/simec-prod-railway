import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

function AppBreadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <div
      className="border-b px-4 py-3 sm:px-6"
      style={{
        borderColor: 'var(--brand-topbar-border)',
        backgroundColor: 'var(--bg-breadcrumb)',
      }}
    >
      <nav
        className="flex flex-wrap items-center gap-1 text-sm"
        style={{ color: 'var(--text-brand-surface-muted)' }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="font-medium transition hover:opacity-80"
                  style={{ color: 'var(--text-brand-surface-muted)' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'font-semibold' : ''}
                  style={{
                    color: isLast
                      ? 'var(--text-brand-surface)'
                      : 'var(--text-brand-surface-muted)',
                  }}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span
                  className="mx-1"
                  style={{ color: 'var(--text-brand-surface-muted)' }}
                >
                  /
                </span>
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