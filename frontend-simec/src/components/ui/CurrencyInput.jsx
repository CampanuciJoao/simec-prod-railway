// src/components/CurrencyInput.jsx
import React from 'react';

const formatCurrency = (value) => {
  if (!value) return '';
  // Remove tudo que não for dígito
  const numericValue = value.toString().replace(/\D/g, '');
  if (numericValue === '') return '';
  
  // Converte para número e formata para BRL
  const number = parseFloat(numericValue) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number);
};

const CurrencyInput = ({ value, onChange, ...props }) => {
  const handleChange = (e) => {
    // Remove o R$, pontos e vírgula para obter apenas os números
    const rawValue = e.target.value.replace(/\D/g, '');
    onChange({
      target: {
        name: e.target.name,
        value: rawValue, // Passa apenas os números para o estado do formulário
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