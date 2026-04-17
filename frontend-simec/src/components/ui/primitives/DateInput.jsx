import React from 'react';
import PropTypes from 'prop-types';

import FormFieldShell from '@/components/ui/primitives/FormFieldShell';

function DateInput({
  id,
  label,
  hint,
  error,
  required = false,
  value,
  onChange,
  name,
  className = '',
  disabled = false,
  min,
  max,
  onFocus,
  onBlur,
  ...props
}) {
  const inputId = id || name;

  const handleFocus = (event) => {
    event.currentTarget.style.boxShadow = error
      ? '0 0 0 4px var(--color-danger-soft)'
      : '0 0 0 4px var(--brand-primary-soft)';

    onFocus?.(event);
  };

  const handleBlur = (event) => {
    event.currentTarget.style.boxShadow = 'none';
    onBlur?.(event);
  };

  return (
    <FormFieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="date"
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        className={[
          'ui-transition w-full rounded-xl border px-3 py-2.5 text-sm outline-none',
          'disabled:cursor-not-allowed disabled:opacity-70',
          className,
        ].join(' ')}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: error ? 'var(--color-danger)' : 'var(--border-default)',
          color: 'var(--text-primary)',
          boxShadow: 'none',
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    </FormFieldShell>
  );
}

DateInput.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  value: PropTypes.string,
  onChange: PropTypes.func,
  name: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  min: PropTypes.string,
  max: PropTypes.string,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
};

export default DateInput;