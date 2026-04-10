// src/components/DateInput.jsx
// NOVO COMPONENTE DE INPUT DE DATA COM MÁSCARA 'dd/mm/aaaa'

import React, { useState, useEffect } from 'react';

// Função para converter 'YYYY-MM-DD' para 'DD/MM/YYYY'
const toDisplayFormat = (isoDate) => {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate; // Retorna o que tiver se não for formato completo
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Função para converter 'DD/MM/YYYY' para 'YYYY-MM-DD'
const toISOFormat = (displayDate) => {
  if (!displayDate || displayDate.length < 10) return '';
  const parts = displayDate.split('/');
  if (parts.length < 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};


function DateInput({ value, onChange, name, ...props }) {
  // `value` (do pai) está no formato 'YYYY-MM-DD'
  // `displayValue` (local) está no formato 'DD/MM/YYYY'
  const [displayValue, setDisplayValue] = useState(toDisplayFormat(value));

  // Atualiza o display se o valor do pai mudar (ex: ao carregar dados de edição)
  useEffect(() => {
    setDisplayValue(toDisplayFormat(value));
  }, [value]);

  const handleInputChange = (e) => {
    let input = e.target.value.replace(/\D/g, ''); // Remove tudo que não for dígito
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

    // Converte de volta para o formato ISO para o estado do formulário pai
    const isoValue = toISOFormat(formatted);
    // Simula o evento onChange para o formulário pai
    onChange({
      target: {
        name: name,
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