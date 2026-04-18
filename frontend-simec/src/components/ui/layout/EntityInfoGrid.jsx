import React from 'react';
import PropTypes from 'prop-types';

import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';
import Card from '@/components/ui/primitives/Card';

function EntityInfoItem({
  label,
  value,
  fullWidth = false,
  compact = false,
}) {
  return (
    <Card
      surface="soft"
      className={[
        'min-w-0 rounded-xl',
        fullWidth ? 'md:col-span-2 xl:col-span-3' : '',
      ].join(' ')}
      padded={false}
      style={{
        padding: compact ? '10px 12px' : '16px',
      }}
    >
      <span
        className={[
          'block uppercase tracking-[0.14em]',
          compact ? 'text-[10px] font-bold' : 'text-[11px] font-bold',
        ].join(' ')}
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>

      <div
        className={[
          'min-w-0 break-words font-medium',
          compact ? 'mt-1 text-sm leading-5' : 'mt-2 text-sm',
        ].join(' ')}
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
  compact: PropTypes.bool,
};

function EntityInfoGrid({
  items = [],
  className = '',
  compact = false,
}) {
  return (
    <ResponsiveGrid
      preset="details"
      className={[
        'min-w-0',
        compact ? 'gap-3 xl:grid-cols-5' : '',
        className,
      ].join(' ')}
    >
      {items.map((item) => (
        <EntityInfoItem
          key={item.key || item.label}
          label={item.label}
          value={item.value}
          fullWidth={item.fullWidth}
          compact={compact}
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
  compact: PropTypes.bool,
};

export default EntityInfoGrid;