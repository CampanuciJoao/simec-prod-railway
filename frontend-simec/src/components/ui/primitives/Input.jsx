import React from 'react';
import PropTypes from 'prop-types';

function Input({
  label,
  className = '',
  ...props
}) {
  const inputElement = (
    <input
      className={[
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition',
        'placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      ].join(' ')}
      {...props}
    />
  );

  if (!label) {
    return inputElement;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {inputElement}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
};

export default Input;