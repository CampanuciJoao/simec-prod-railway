// src/components/ui/TimeInput.jsx
// NOVO COMPONENTE DE INPUT DE HORA COM MÁSCARA 'HH:mm'

import React from 'react';

function TimeInput({ value, onChange, name, ...props }) {
  const handleTimeChange = (e) => {
    const rawValue = e.target.value;
    const digits = rawValue.replace(/\D/g, '');
    const truncatedDigits = digits.substring(0, 4);

    let formattedValue = truncatedDigits;

    if (truncatedDigits.length > 2) {
      formattedValue = `${truncatedDigits.substring(0, 2)}:${truncatedDigits.substring(2)}`;
    }

    onChange({
      target: {
        name,
        value: formattedValue,
      },
    });
  };

  return (
    <input
      type="text"
      {...props}
      name={name}
      value={value || ''}
      onChange={handleTimeChange}
      placeholder="HH:mm"
      maxLength="5"
    />
  );
}

export default TimeInput;