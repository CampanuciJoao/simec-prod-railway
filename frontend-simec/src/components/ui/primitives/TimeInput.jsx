import React from 'react';
import PropTypes from 'prop-types';
import FormFieldShell from './FormFieldShell';

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
  ...props
}) {
  const inputId = id || name;

  const handleTimeChange = (e) => {
    const formattedValue = formatMaskedTime(e.target.value);

    onChange?.({
      target: {
        name,
        value: formattedValue,
      },
    });
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
          'ui-text-primary',
          'disabled:cursor-not-allowed disabled:opacity-70',
          className,
        ].join(' ')}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: error ? 'var(--color-danger)' : 'var(--border-default)',
          color: 'var(--text-primary)',
          boxShadow: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = error
            ? '0 0 0 4px var(--color-danger-soft)'
            : '0 0 0 4px var(--brand-primary-soft)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
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
};

export default TimeInput;