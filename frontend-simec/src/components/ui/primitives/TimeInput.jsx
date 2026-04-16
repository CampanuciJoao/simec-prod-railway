import React from 'react';
import PropTypes from 'prop-types';

function TimeInput({
  label,
  value,
  onChange,
  name,
  className = '',
  disabled = false,
  step = 300,
  min,
  max,
  ...props
}) {
  const inputElement = (
    <input
      type="time"
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      step={step}
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

TimeInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  name: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  step: PropTypes.number,
  min: PropTypes.string,
  max: PropTypes.string,
};

export default TimeInput;