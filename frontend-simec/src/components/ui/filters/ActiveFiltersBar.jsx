import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

function ActiveFiltersBar({
  filters = [],
  onRemove,
  onClearAll,
  clearLabel = 'Limpar tudo',
  className = '',
}) {
  if (!filters.length) return null;

  return (
    <div className={['flex flex-wrap items-center gap-2', className].join(' ')}>
      {filters.map((filter) => (
        <button
          key={`${filter.key}-${filter.value}`}
          type="button"
          onClick={() => onRemove(filter.key)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span>{filter.label}</span>
          <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold text-blue-600 hover:underline"
      >
        {clearLabel}
      </button>
    </div>
  );
}

ActiveFiltersBar.propTypes = {
  filters: PropTypes.array,
  onRemove: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  clearLabel: PropTypes.string,
  className: PropTypes.string,
};

export default ActiveFiltersBar;