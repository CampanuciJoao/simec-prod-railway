import React from 'react';
import PropTypes from 'prop-types';

import { ActiveFiltersBar } from '@/components/ui/filters';

function EquipamentosActiveFiltersBar({
  filters = [],
  onRemove,
  onClearAll,
  className = '',
}) {
  return (
    <ActiveFiltersBar
      filters={filters}
      onRemove={onRemove}
      onClearAll={onClearAll}
      clearLabel="Limpar filtros"
      className={className}
    />
  );
}

EquipamentosActiveFiltersBar.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.any,
      label: PropTypes.string,
    })
  ),
  onRemove: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default EquipamentosActiveFiltersBar;