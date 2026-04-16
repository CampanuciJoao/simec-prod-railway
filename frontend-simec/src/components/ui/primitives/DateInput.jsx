import React from 'react';
import PropTypes from 'prop-types';

function DateInput({
  label,
  value,
  onChange,
  name,
  className = '',
  disabled = false,
  min,
  max,
  ...props
}) {
  const inputElement = (
    <input
      type="date"
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      min={min}
      max={max}
      className={[
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition',
        'focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
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

DateInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  name: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  min: PropTypes.string,
  max: PropTypes.string,
};

export default DateInput;