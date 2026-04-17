import React from 'react';
import PropTypes from 'prop-types';
import FormFieldShell from './FormFieldShell';

function Textarea({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  rows = 4,
  ...props
}) {
  const textareaId = id || props.name;

  return (
    <FormFieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={textareaId}
    >
      <textarea
        id={textareaId}
        rows={rows}
        className={[
          'w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 resize-y',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
            : 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
          className,
        ].join(' ')}
        {...props}
      />
    </FormFieldShell>
  );
}

Textarea.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  rows: PropTypes.number,
};

export default Textarea;