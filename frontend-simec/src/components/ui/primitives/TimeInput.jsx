import React from 'react';
import PropTypes from 'prop-types';

import FormFieldShell from '@/components/ui/primitives/FormFieldShell';

function formatLooseTime(raw = '') {
  const sanitized = String(raw).replace(/[^\d:]/g, '');

  if (sanitized.includes(':')) {
    const [rawHour = '', rawMinute = ''] = sanitized.split(':');
    const hour = rawHour.replace(/\D/g, '').slice(0, 2);
    const minute = rawMinute.replace(/\D/g, '').slice(0, 2);

    if (!minute) return hour ? `${hour}:` : '';
    return `${hour}:${minute}`;
  }

  const digits = sanitized.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `${digits.slice(0, 1)}:${digits.slice(1)}`;

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeTimeValue(raw = '') {
  const match = String(raw)
    .trim()
    .match(/^(\d{1,2})(?::?(\d{1,2}))?$/);

  if (!match) return raw;

  const hour = Number(match[1]);
  const minute = Number(match[2] || '0');

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return raw;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildDefaultSuggestions(intervaloMinutos = 30) {
  const suggestions = [];

  for (let hora = 0; hora < 24; hora += 1) {
    for (let minuto = 0; minuto < 60; minuto += intervaloMinutos) {
      suggestions.push(
        `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
      );
    }
  }

  return suggestions;
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
  suggestions = buildDefaultSuggestions(),
  onFocus,
  onBlur,
  ...props
}) {
  const inputId = id || name;

  const handleTimeChange = (event) => {
    const formattedValue = formatLooseTime(event.target.value);

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
    const normalizedValue = normalizeTimeValue(event.target.value);

    if (normalizedValue !== event.target.value) {
      onChange?.({
        target: {
          name,
          value: normalizedValue,
        },
      });
    }

    event.currentTarget.style.boxShadow = 'none';
    onBlur?.(event);
  };

  const datalistId = inputId ? `${inputId}-suggestions` : undefined;

  return (
    <FormFieldShell
      label={label}
      hint={hint || 'Digite ou selecione um horário'}
      error={error}
      required={required}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="text"
        inputMode="text"
        autoComplete="off"
        name={name}
        value={value || ''}
        onChange={handleTimeChange}
        placeholder="HH:mm"
        maxLength={5}
        list={datalistId}
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

      {datalistId ? (
        <datalist id={datalistId}>
          {suggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
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
  suggestions: PropTypes.arrayOf(PropTypes.string),
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
};

export default TimeInput;
