import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function DetalhesEquipamentoTabs({ abas, abaAtiva, onChange }) {
  return (
    <div className="tabs-navigation">
      {abas.map((aba) => (
        <button
          key={aba.id}
          type="button"
          onClick={() => onChange(aba.id)}
          className={`tab-button ${abaAtiva === aba.id ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={aba.icon} /> {aba.label}
        </button>
      ))}
    </div>
  );
}

export default DetalhesEquipamentoTabs;