import React, { useState } from 'react';
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
  if (!value || typeof value !== 'string') return 0;

  const cleaned = value.replace(/\s/g, '').replace(/R\$\s*/gi, '');

  if (cleaned.includes(',')) {
    // pt-BR: pontos são separadores de milhar, vírgula é decimal
    const result = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    return Number.isNaN(result) ? 0 : result;
  }

  const dotCount = (cleaned.match(/\./g) || []).length;

  if (dotCount <= 1) {
    // Sem ponto ou com único ponto: trata como separador decimal (ex: "4201.65")
    const result = parseFloat(cleaned.replace(/[^\d.-]/g, ''));
    return Number.isNaN(result) ? 0 : result;
  }

  // Múltiplos pontos sem vírgula: todos são separadores de milhar (ex: "4.201.000")
  const result = parseFloat(cleaned.replace(/\./g, '').replace(/[^\d-]/g, ''));
  return Number.isNaN(result) ? 0 : result;
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
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (event) => {
    const num = Number(value);
    // Sem separador de milhar durante a edição — evita ambiguidade entre
    // ponto de milhar e ponto decimal (ex: "4201,65" em vez de "4.201,65")
    const editable =
      !value || Number.isNaN(num) || num === 0
        ? ''
        : num.toFixed(2).replace('.', ',');
    setLocalValue(editable);
    setIsFocused(true);
    event.currentTarget.style.boxShadow = error
      ? '0 0 0 4px var(--color-danger-soft)'
      : '0 0 0 4px var(--brand-primary-soft)';
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setIsFocused(false);
    event.currentTarget.style.boxShadow = 'none';
    const parsed = parseCurrencyValue(localValue);
    onChange?.({ target: { name, value: parsed, type: 'number' } });
    onBlur?.(event);
  };

  const handleChange = (event) => {
    const raw = event.target.value;
    setLocalValue(raw);
    onChange?.({ target: { name, value: parseCurrencyValue(raw), type: 'number' } });
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
        value={isFocused ? localValue : formatCurrencyValue(value)}
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
