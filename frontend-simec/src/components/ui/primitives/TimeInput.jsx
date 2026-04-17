import React from 'react';
import PropTypes from 'prop-types';

import FormFieldShell from '@/components/ui/primitives/FormFieldShell';

function formatMaskedTime(raw = '') {
  const digits = String(raw).replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function TimeInput({
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
  onFocus,
  onBlur,
  ...props
}) {
  const inputId = id || name;

  const handleTimeChange = (event) => {
    const formattedValue = formatMaskedTime(event.target.value);

    onChange?.({
      target: {
        name,
        value: formattedValue,
      },
    });
  };

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
      hint={hint || 'HH:mm'}
      error={error}
      required={required}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        name={name}
        value={value || ''}
        onChange={handleTimeChange}
        placeholder="HH:mm"
        maxLength={5}
        disabled={disabled}
        className={[
          'ui-transition w-full rounded-xl border px-3 py-2.5 text-sm outline-none placeholder:opacity-70',
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

TimeInput.propTypes = {
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
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
};

export default TimeInput;