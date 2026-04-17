import React from 'react';
import PropTypes from 'prop-types';

import FormFieldShell from '@/components/ui/primitives/FormFieldShell';

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
        {...props}
        className={[
          'w-full rounded-xl px-3 py-2.5 text-sm transition-all outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',

          // 🎯 BASE (alinhado com Dashboard)
          'border',
          
          // 🎯 LIGHT / DARK via tokens
          'bg-[var(--bg-surface)]',
          'text-[var(--text-primary)]',
          'placeholder:text-[var(--text-muted)]',
          'border-[var(--border-default)]',

          // 🎯 HOVER
          'hover:border-[var(--border-strong)]',

          // 🎯 FOCUS (cara do Simec)
          'focus:border-[var(--color-primary)]',
          'focus:ring-4',
          'focus:ring-[var(--color-primary-soft)]',

          // 🎯 ERROR override
          error
            ? '!border-[var(--color-danger)] focus:!border-[var(--color-danger)] focus:!ring-[var(--color-danger-soft)]'
            : '',

          className,
        ].join(' ')}
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