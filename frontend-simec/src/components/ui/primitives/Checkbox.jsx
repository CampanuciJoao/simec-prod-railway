import React from 'react';
import PropTypes from 'prop-types';

function Checkbox({
  id,
  name,
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  className = '',
}) {
  const inputId =
    id || `checkbox-${label?.toLowerCase().replace(/\s+/g, '-') || 'field'}`;

  return (
    <label
      htmlFor={inputId}
      className={[
        'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 transition',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      ].join(' ')}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <input
        id={inputId}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 rounded"
        style={{
          accentColor: 'var(--brand-primary)',
        }}
      />

      <div className="min-w-0">
        {label ? (
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
          </p>
        ) : null}

        {description ? (
          <p
            className="mt-0.5 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {description}
          </p>
        ) : null}
      </div>
    </label>
  );
}

Checkbox.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  description: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Checkbox;