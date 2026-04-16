import React from 'react';
import PropTypes from 'prop-types';

function TimeInput({
  label,
  value,
  onChange,
  name,
  className = '',
  disabled = false,
  ...props
}) {
  const handleTimeChange = (e) => {
    const rawValue = e.target.value;
    const digits = rawValue.replace(/\D/g, '').substring(0, 4);

    let formattedValue = digits;

    if (digits.length > 2) {
      formattedValue = `${digits.substring(0, 2)}:${digits.substring(2)}`;
    }

    onChange?.({
      target: {
        name,
        value: formattedValue,
      },
    });
  };

  const inputElement = (
    <input
      type="text"
      name={name}
      value={value || ''}
      onChange={handleTimeChange}
      placeholder="HH:mm"
      maxLength={5}
      disabled={disabled}
      className={[
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400',
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
};

export default TimeInput;