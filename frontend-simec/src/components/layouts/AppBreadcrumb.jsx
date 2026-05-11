import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

function AppBreadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <div
      className="px-4 sm:px-6"
      style={{
        backgroundColor: 'var(--bg-app)',
        borderTop: '2px solid var(--text-primary)',
        borderBottom: '2px solid var(--text-primary)',
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      <nav
        className="flex flex-wrap items-center gap-1"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="transition hover:opacity-80"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  style={{
                    color: isLast ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: isLast ? 800 : 600,
                    background: isLast ? 'var(--brand-accent)' : 'transparent',
                    padding: isLast ? '2px 6px' : 0,
                  }}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>
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
