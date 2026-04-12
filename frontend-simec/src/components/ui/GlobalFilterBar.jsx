import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

const formatarLabel = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/([A-Z])/g, ' $1').trim();
};

function CustomSelect({ config }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <FontAwesomeIcon icon={faFilter} />
      </span>

      <select
        id={config.id}
        value={config.value || ''}
        onChange={(e) => config.onChange(e.target.value)}
        className="select w-full pl-10 pr-10"
      >
        <option value="">{config.defaultLabel}</option>

        {config.options.map((opt) => {
          const valor = typeof opt === 'object' ? opt.value : opt;
          const rotulo = typeof opt === 'object' ? opt.label : formatarLabel(opt);

          return (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          );
        })}
      </select>
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
        {/* Busca */}
        <div className="xl:col-span-4">
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

        {/* Filtros */}
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