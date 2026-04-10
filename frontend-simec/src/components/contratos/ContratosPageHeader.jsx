import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileContract } from '@fortawesome/free-solid-svg-icons';

function ContratosPageHeader({ onCreate }) {
  return (
    <div className="page-title-card">
      <h1 className="page-title-internal">
        <FontAwesomeIcon icon={faFileContract} /> Gestão de Contratos de Manutenção
      </h1>

      <button type="button" className="btn btn-primary" onClick={onCreate}>
        <FontAwesomeIcon icon={faPlus} /> Novo Contrato
      </button>
    </div>
  );
}

export default ContratosPageHeader;