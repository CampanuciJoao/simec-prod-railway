import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

function GlobalFilterBar({
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  selectFilters = [],
  className = '',
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5',
        className,
      ].join(' ')}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Busca
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <FontAwesomeIcon icon={faSearch} />
            </span>

            <input
              type="text"
              value={searchTerm}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {selectFilters.map((filter) => (
          <div
            key={filter.id || filter.name}
            className="min-w-0"
          >
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {filter.label || filter.defaultLabel || 'Filtro'}
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FontAwesomeIcon icon={faFilter} />
              </span>

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
              </span>

              <select
                value={filter.value ?? ''}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                title={
                  filter.options?.find((opt) => opt.value === filter.value)?.label ||
                  filter.defaultLabel ||
                  ''
                }
              >
                <option value="">
                  {filter.defaultLabel || 'Todos'}
                </option>

                {(filter.options || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

GlobalFilterBar.propTypes = {
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  selectFilters: PropTypes.array,
  className: PropTypes.string,
};

export default GlobalFilterBar;