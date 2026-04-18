import React from 'react';
import PropTypes from 'prop-types';

import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';
import Card from '@/components/ui/primitives/Card';

function EntityInfoItem({ label, value, fullWidth = false }) {
  return (
    <Card
      surface="default"
      className={[
        'min-w-0 rounded-xl',
        fullWidth ? 'md:col-span-2 xl:col-span-3' : '',
      ].join(' ')}
      padded
    >
      <span
        className="block text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>

      <div
        className="mt-2 min-w-0 break-words text-sm font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {value || 'N/A'}
      </div>
    </Card>
  );
}

EntityInfoItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  fullWidth: PropTypes.bool,
};

function EntityInfoGrid({ items = [], className = '' }) {
  return (
    <ResponsiveGrid preset="details" className={['min-w-0', className].join(' ')}>
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