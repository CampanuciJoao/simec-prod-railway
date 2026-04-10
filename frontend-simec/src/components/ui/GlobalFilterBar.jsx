// Ficheiro: frontend-simec/src/components/ui/GlobalFilterBar.jsx
// VERSÃO 6.0 - COM LIMPEZA DE BUSCA E FORMATAÇÃO DE RÓTULOS AVANÇADA

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

import '../../styles/components/GlobalFilterBar.css';

/**
 * @function formatarLabel
 * @description Transforma valores de Enum (CamelCase) em textos legíveis.
 * Ex: "UsoLimitado" -> "Uso Limitado"
 */
const formatarLabel = (valor) => {
  if (!valor) return '';
  return valor.replace(/([A-Z])/g, ' $1').trim();
};

/**
 * @component CustomSelect
 * @description Componente interno para os menus de seleção (filtros laterais).
 */
const CustomSelect = ({ config }) => (
  <div className="filter-select-wrapper">
    <FontAwesomeIcon icon={faFilter} className="filter-icon" />
    <select
      id={config.id}
      value={config.value || ''}
      onChange={(e) => config.onChange(e.target.value)}
      className="filter-select"
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

/**
 * @component GlobalFilterBar
 * @description Barra de ferramentas principal para busca e filtragem.
 */
function GlobalFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  selectFilters = [],
}) {
  const handleClearSearch = () => {
    onSearchChange({ target: { value: '' } });
  };

  return (
    <div className="global-filter-bar">
      <div className="search-input-wrapper">
        <FontAwesomeIcon icon={faSearch} className="search-icon" />

        <input
          type="text"
          placeholder={searchPlaceholder || 'Buscar...'}
          value={searchTerm}
          onChange={onSearchChange}
          className="filter-input"
        />

        {searchTerm && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={handleClearSearch}
            title="Limpar busca"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>

      <div className="select-filters-container">
        {selectFilters.map((filterConfig) => (
          <CustomSelect key={filterConfig.id} config={filterConfig} />
        ))}
      </div>
    </div>
  );
}

export default GlobalFilterBar;