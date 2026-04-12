import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

const formatarLabel = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/([A-Z])/g, ' $1').trim();
};

const getOptionValue = (opt) => {
  return typeof opt === 'object' ? opt.value : opt;
};

const getOptionLabel = (opt) => {
  if (typeof opt === 'object') {
    return opt.label ?? formatarLabel(opt.value);
  }
  return formatarLabel(opt);
};

function CustomSelect({ config }) {
  const {
    id,
    label,
    value,
    onChange,
    options = [],
    defaultLabel,
  } = config;

  const placeholder = defaultLabel || `Filtrar por ${label?.toLowerCase() || 'opção'}`;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <FontAwesomeIcon icon={faFilter} />
        </span>

        <select
          id={id}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          className="select w-full pl-10 pr-10 text-slate-700"
        >
          <option value="">{placeholder}</option>

          {options.map((opt) => {
            const optionValue = getOptionValue(opt);
            const optionLabel = getOptionLabel(opt);

            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

function GlobalFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  selectFilters = [],
}) {
  const handleClearSearch = () => {
    onSearchChange?.({ target: { value: '' } });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Busca
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FontAwesomeIcon icon={faSearch} />
              </span>

              <input
                type="text"
                placeholder={searchPlaceholder || 'Buscar...'}
                value={searchTerm}
                onChange={onSearchChange}
                className="input w-full pl-10 pr-10"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  title="Limpar busca"
                  className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-8 xl:grid-cols-4">
          {selectFilters.map((filterConfig) => (
            <CustomSelect key={filterConfig.id} config={filterConfig} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default GlobalFilterBar;