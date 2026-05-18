import React from 'react';
import PropTypes from 'prop-types';

function ResponsiveTabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div className={['overflow-x-auto', className].join(' ')}>
      <div
        className="flex w-max min-w-full gap-2 pb-2"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className="inline-flex items-center whitespace-nowrap rounded-t-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all"
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--brand-primary-soft)',
                      color: 'var(--brand-primary)',
                      boxShadow: 'var(--shadow-sm)',
                    }
                  : {
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface-soft)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              {tab.icon ? <span className="mr-2 inline-flex">{tab.icon}</span> : null}
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null ? (
                <span
                  className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--brand-primary)',
                          color: '#fff',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface-soft)',
                          color: 'var(--text-muted)',
                        }
                  }
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

ResponsiveTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
  activeTab: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default ResponsiveTabs;
