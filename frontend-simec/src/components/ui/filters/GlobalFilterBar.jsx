import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

import {
  Card,
  Input,
  Select,
  FormFieldShell,
} from '@/components/ui';

function GlobalFilterBar({
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  selectFilters = [],
  className = '',
}) {
  return (
    <Card
      className={[
        'rounded-2xl md:rounded-3xl',
        className,
      ].join(' ')}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(320px,1.5fr)_repeat(auto-fit,minmax(190px,1fr))]">
        <div className="min-w-0">
          <FormFieldShell label="Busca">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <FontAwesomeIcon icon={faSearch} />
              </span>

              <Input
                type="text"
                value={searchTerm}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                className="pl-10"
              />
            </div>
          </FormFieldShell>
        </div>

        {selectFilters.map((filter) => (
          <div
            key={filter.id || filter.name}
            className="min-w-0"
          >
            <FormFieldShell
              label={filter.label || filter.defaultLabel || 'Filtro'}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-[1] text-slate-400 dark:text-slate-500">
                  <FontAwesomeIcon icon={faFilter} />
                </span>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 z-[1] text-slate-400 dark:text-slate-500">
                  <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                </span>

                <Select
                  value={filter.value ?? ''}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="pl-10 pr-10"
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
                </Select>
              </div>
            </FormFieldShell>
          </div>
        ))}
      </div>
    </Card>
  );
}

GlobalFilterBar.propTypes = {
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  selectFilters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      label: PropTypes.string,
      value: PropTypes.any,
      onChange: PropTypes.func.isRequired,
      defaultLabel: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.any,
          label: PropTypes.string,
        })
      ),
    })
  ),
  className: PropTypes.string,
};

export default GlobalFilterBar;