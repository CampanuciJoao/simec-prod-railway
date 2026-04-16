import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const toDisplayFormat = (isoDate) => {
  if (!isoDate || typeof isoDate !== 'string') return '';

  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const toISOFormat = (displayDate) => {
  if (!displayDate || displayDate.length < 10) return '';

  const parts = displayDate.split('/');
  if (parts.length < 3) return '';

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

function DateInput({
  label,
  value,
  onChange,
  name,
  className = '',
  disabled = false,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState(toDisplayFormat(value));

  useEffect(() => {
    setDisplayValue(toDisplayFormat(value));
  }, [value]);

  const handleInputChange = (e) => {
    let input = e.target.value.replace(/\D/g, '');
    let formatted = '';

    if (input.length > 0) {
      formatted = input.substring(0, 2);
    }
    if (input.length > 2) {
      formatted += `/${input.substring(2, 4)}`;
    }
    if (input.length > 4) {
      formatted += `/${input.substring(4, 8)}`;
    }

    setDisplayValue(formatted);

    const isoValue = toISOFormat(formatted);

    onChange?.({
      target: {
        name,
        value: isoValue,
      },
    });
  };

  const inputElement = (
    <input
      type="text"
      name={name}
      value={displayValue}
      onChange={handleInputChange}
      placeholder="dd/mm/aaaa"
      maxLength={10}
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

DateInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  name: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

export default DateInput;