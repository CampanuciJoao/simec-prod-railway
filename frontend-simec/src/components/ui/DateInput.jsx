// src/components/ui/DateInput.jsx
// NOVO COMPONENTE DE INPUT DE DATA COM MÁSCARA 'dd/mm/aaaa'

import React, { useState, useEffect } from 'react';

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

function DateInput({ value, onChange, name, ...props }) {
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
      formatted += '/' + input.substring(2, 4);
    }
    if (input.length > 4) {
      formatted += '/' + input.substring(4, 8);
    }

    setDisplayValue(formatted);

    const isoValue = toISOFormat(formatted);

    onChange({
      target: {
        name,
        value: isoValue,
      },
    });
  };

  return (
    <input
      type="text"
      {...props}
      name={name}
      value={displayValue}
      onChange={handleInputChange}
      placeholder="dd/mm/aaaa"
      maxLength="10"
    />
  );
}

export default DateInput;