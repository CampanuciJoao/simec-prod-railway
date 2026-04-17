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
      surface="default"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1 xl:max-w-[420px]">
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            >
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
        </div>

        <div className="min-w-0 xl:flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:flex-nowrap">
            {selectFilters.map((filter) => (
              <div
                key={filter.id || filter.name}
                className="min-w-0 sm:flex-1 xl:min-w-[180px]"
              >
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <FontAwesomeIcon icon={faFilter} />
                  </span>

                  <span
                    className="pointer-events-none absolute right-3 top-1/2 z-[1] -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                  </span>

                  <Select
                    value={filter.value ?? ''}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="pl-10 pr-10"
                    title={
                      filter.options?.find((opt) => opt.value === filter.value)?.label ||
                      filter.defaultLabel ||
                      filter.label ||
                      ''
                    }
                  >
                    <option value="">
                      {filter.label || filter.defaultLabel || 'Todos'}
                    </option>

                    {(filter.options || []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
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