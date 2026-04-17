import React from 'react';
import PropTypes from 'prop-types';
import FormFieldShell from './FormFieldShell';

function Input({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  ...props
}) {
  const inputId = id || props.name;

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

Input.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
};

export default Input;