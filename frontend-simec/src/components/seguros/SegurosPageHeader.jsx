import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

function SegurosPageHeader({ onCreate }) {
  return (
    <div className="page-title-card">
      <h1 className="page-title-internal">
        <FontAwesomeIcon icon={faShieldAlt} /> Gestão de Seguros
      </h1>

      <button type="button" className="btn btn-primary" onClick={onCreate}>
        <FontAwesomeIcon icon={faPlus} /> Novo Seguro
      </button>
    </div>
  );
}

export default SegurosPageHeader;