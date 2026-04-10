// src/components/TimeInput.jsx
// NOVO COMPONENTE DE INPUT DE HORA COM MÁSCARA 'HH:mm'

import React from 'react';

function TimeInput({ value, onChange, name, ...props }) {

  const handleTimeChange = (e) => {
    // Pega o valor atual do input
    const rawValue = e.target.value;
    
    // Remove tudo que não for dígito
    const digits = rawValue.replace(/\D/g, '');

    // Limita para 4 dígitos no total (HHmm)
    const truncatedDigits = digits.substring(0, 4);

    let formattedValue = truncatedDigits;

    // Se o usuário digitou mais de 2 números, adicionamos o ':'
    if (truncatedDigits.length > 2) {
      formattedValue = `${truncatedDigits.substring(0, 2)}:${truncatedDigits.substring(2)}`;
    }

    // Chamamos a função onChange do formulário pai, passando o valor formatado
    onChange({
      target: {
        name: name,
        value: formattedValue,
      },
    });
  };

  return (
    <input
      type="text" // Usamos type="text" para controlar a máscara
      {...props}
      name={name}
      value={value || ''} // Usa o valor do pai, garantindo que seja uma string
      onChange={handleTimeChange}
      placeholder="HH:mm"
      maxLength="5" // Limita o tamanho total para HH:mm
    />
  );
}

export default TimeInput;