import React from 'react';
import PropTypes from 'prop-types';
import ResponsiveGrid from './ResponsiveGrid';

function EntityInfoItem({ label, value, fullWidth = false }) {
  return (
    <div
      className={[
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        fullWidth ? 'md:col-span-2 xl:col-span-3' : '',
      ].join(' ')}
    >
      <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>

      <div className="mt-2 break-words text-sm font-medium text-slate-800">
        {value || 'N/A'}
      </div>
    </div>
  );
}

EntityInfoItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  fullWidth: PropTypes.bool,
};

function EntityInfoGrid({ items = [], className = '' }) {
  return (
    <ResponsiveGrid preset="details" className={className}>
      {items.map((item) => (
        <EntityInfoItem
          key={item.key || item.label}
          label={item.label}
          value={item.value}
          fullWidth={item.fullWidth}
        />
      ))}
    </ResponsiveGrid>
  );
}

EntityInfoGrid.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.string.isRequired,
      value: PropTypes.node,
      fullWidth: PropTypes.bool,
    })
  ),
  className: PropTypes.string,
};

export default EntityInfoGrid;