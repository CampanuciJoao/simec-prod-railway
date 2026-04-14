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
      <div className="flex w-max min-w-full gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                'inline-flex items-center whitespace-nowrap rounded-t-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all',
                isActive
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
              ].join(' ')}
            >
              {tab.icon ? <span className="mr-2 inline-flex">{tab.icon}</span> : null}
              {tab.label}
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
    })
  ),
  activeTab: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default ResponsiveTabs;