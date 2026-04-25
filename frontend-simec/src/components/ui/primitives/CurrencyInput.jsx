import React, { useRef } from 'react';
import PropTypes from 'prop-types';

import FormFieldShell from '@/components/ui/primitives/FormFieldShell';

function formatCurrencyValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return '';
  }

  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function parseCurrencyValue(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) {
    return 0;
  }

  return Number(digits) / 100;
}

function CurrencyInput({
  id,
  name,
  label,
  hint,
  error,
  required = false,
  value,
  onChange,
  className = '',
  onFocus,
  onBlur,
  placeholder = 'R$ 0,00',
  ...props
}) {
  const inputId = id || name;
  const inputRef = useRef(null);

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

  const handleChange = (event) => {
    const numericValue = parseCurrencyValue(event.target.value);
    const formattedValue = formatCurrencyValue(numericValue);

    onChange?.({
      target: {
        name,
        value: numericValue,
        type: 'number',
      },
    });

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;

      input.value = formattedValue;
      const position = formattedValue.length;
      input.setSelectionRange(position, position);
    });
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
        ref={inputRef}
        id={inputId}
        name={name}
        type="text"
        inputMode="decimal"
        value={formatCurrencyValue(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
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
        {...props}
      />
    </FormFieldShell>
  );
}

CurrencyInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChange: PropTypes.func,
  className: PropTypes.string,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string,
};

export default CurrencyInput;
