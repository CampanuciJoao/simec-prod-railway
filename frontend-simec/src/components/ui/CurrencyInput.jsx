// src/components/ui/CurrencyInput.jsx

import React from 'react';

const formatCurrency = (value) => {
  if (!value) return '';

  const numericValue = value.toString().replace(/\D/g, '');

  if (numericValue === '') return '';

  const number = parseFloat(numericValue) / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number);
};

const CurrencyInput = ({ value, onChange, ...props }) => {
  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');

    onChange({
      target: {
        name: e.target.name,
        value: rawValue,
      },
    });
  };

  return (
    <input
      {...props}
      value={formatCurrency(value)}
      onChange={handleChange}
      placeholder="R$ 0,00"
    />
  );
};

export default CurrencyInput;