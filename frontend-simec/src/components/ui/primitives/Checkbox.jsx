import React from 'react';
import PropTypes from 'prop-types';

function Checkbox({
  id,
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  className = '',
}) {
  const inputId = id || `checkbox-${label?.toLowerCase().replace(/\s+/g, '-') || 'field'}`;

  return (
    <label
      htmlFor={inputId}
      className={[
        'flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-100',
        className,
      ].join(' ')}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />

      <div className="min-w-0">
        {label ? (
          <p className="text-sm font-semibold text-slate-800">{label}</p>
        ) : null}

        {description ? (
          <p className="text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
    </label>
  );
}

Checkbox.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  description: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Checkbox;