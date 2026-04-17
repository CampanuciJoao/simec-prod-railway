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
        className={[
          'ui-input ui-transition w-full rounded-xl border px-3 py-2.5 text-sm',
          'disabled:cursor-not-allowed disabled:opacity-70',
          className,
        ].join(' ')}
        style={
          error
            ? {
                '--input-border': 'var(--color-danger)',
                '--input-border-hover': 'var(--color-danger)',
                '--input-border-focus': 'var(--color-danger)',
                '--input-ring': 'var(--color-danger-soft)',
              }
            : undefined
        }
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