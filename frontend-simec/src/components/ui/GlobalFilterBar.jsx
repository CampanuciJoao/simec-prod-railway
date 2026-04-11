import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

/**
 * Transforma valores de Enum/CamelCase em textos legíveis.
 * Ex: "UsoLimitado" -> "Uso Limitado"
 */
const formatarLabel = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/([A-Z])/g, ' $1').trim();
};

function CustomSelect({ config }) {
  return (
    <div className="flex min-w-[180px] items-center rounded-xl border border-slate-200 bg-white px-3">
      <FontAwesomeIcon icon={faFilter} className="mr-2 text-slate-400" />

      <select
        id={config.id}
        value={config.value || ''}
        onChange={(e) => config.onChange(e.target.value)}
        className="select w-full border-0 bg-transparent px-0 py-2.5 pr-6 text-sm text-slate-700 shadow-none focus:ring-0"
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
  className = '',
}) {
  const handleClearSearch = () => {
    onSearchChange({ target: { value: '' } });
  };

  return (
    <div
      className={[
        'flex flex-col gap-4 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between',
        className,
      ].join(' ')}
    >
      <div className="relative flex w-full items-center md:max-w-md">
        <FontAwesomeIcon
          icon={faSearch}
          className="pointer-events-none absolute left-3 text-slate-400"
        />

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
            className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={handleClearSearch}
            title="Limpar busca"
            aria-label="Limpar busca"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>

      {selectFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {selectFilters.map((filterConfig) => (
            <CustomSelect key={filterConfig.id} config={filterConfig} />
          ))}
        </div>
      )}
    </div>
  );
}

export default GlobalFilterBar;