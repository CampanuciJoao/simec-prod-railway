import React from 'react';
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
  if (!value || typeof value !== 'string') {
    return 0;
  }

  const normalized = value.replace(/\s/g, '').replace(/R\$/gi, '');
  const hasDecimalSeparator = normalized.includes(',');

  const numericText = hasDecimalSeparator
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized.replace(/\./g, '');

  const sanitized = numericText.replace(/[^\d.-]/g, '');
  const parsed = Number(sanitized);

  return Number.isNaN(parsed) ? 0 : parsed;
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
    onChange?.({
      target: {
        name,
        value: parseCurrencyValue(event.target.value),
        type: 'number',
      },
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
