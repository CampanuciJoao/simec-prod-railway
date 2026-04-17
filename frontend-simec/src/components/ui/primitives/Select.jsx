import React from 'react';
import PropTypes from 'prop-types';

import FormFieldShell from '@/components/ui/primitives/FormFieldShell';

function Select({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  options = [],
  placeholder = 'Selecione',
  children,
  onFocus,
  onBlur,
  ...props
}) {
  const selectId = id || props.name;
  const hasOptionsProp = Array.isArray(options) && options.length > 0;

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
      htmlFor={selectId}
    >
      <select
        id={selectId}
        className={[
          'ui-transition ui-text-primary w-full appearance-none rounded-xl border px-3 py-2.5 pr-10 text-sm outline-none',
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
      >
        {placeholder ? (
          <option value="">
            {placeholder}
          </option>
        ) : null}

        {hasOptionsProp
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    </FormFieldShell>
  );
}

Select.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool,
      ]).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  placeholder: PropTypes.string,
  children: PropTypes.node,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
};

export default Select;