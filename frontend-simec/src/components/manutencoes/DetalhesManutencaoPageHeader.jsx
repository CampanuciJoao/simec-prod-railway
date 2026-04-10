import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPrint } from '@fortawesome/free-solid-svg-icons';

function DetalhesManutencaoPageHeader({ numeroOS, onPrint, onBack }) {
  return (
    <div className="page-title-card no-print">
      <h1 className="page-title-internal">
        Detalhes da Ordem de Serviço: {numeroOS}
      </h1>

      <div className="page-title-actions">
        <button type="button" className="btn btn-primary" onClick={onPrint}>
          <FontAwesomeIcon icon={faPrint} /> Imprimir PDF
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          style={{ marginLeft: '10px' }}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>
    </div>
  );
}

export default DetalhesManutencaoPageHeader;