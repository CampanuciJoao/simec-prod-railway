import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faChartColumn } from '@fortawesome/free-solid-svg-icons';

function RelatoriosPageHeader({ canExport, onExport }) {
  return (
    <div className="page-title-card">
      <h1 className="page-title-internal">
        <FontAwesomeIcon icon={faChartColumn} /> Geração de Relatórios
      </h1>

      {canExport && (
        <button type="button" className="btn btn-danger" onClick={onExport}>
          <FontAwesomeIcon icon={faFilePdf} /> Exportar para PDF
        </button>
      )}
    </div>
  );
}

export default RelatoriosPageHeader;