import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

function UnidadesActiveFiltersBar({ filters, onRemove, onClearAll }) {
  if (!filters.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button key={f.key} onClick={() => onRemove(f.key)}>
          {f.label}
          <FontAwesomeIcon icon={faXmark} />
        </button>
      ))}

      <button onClick={onClearAll}>Limpar tudo</button>
    </div>
  );
}

export default UnidadesActiveFiltersBar;