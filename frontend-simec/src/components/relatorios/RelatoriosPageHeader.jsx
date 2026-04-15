import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faChartColumn } from '@fortawesome/free-solid-svg-icons';

import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';

function RelatoriosPageHeader({ canExport = false, onExport }) {
  return (
    <PageHeader
      title="Geração de Relatórios"
      subtitle="Monte filtros, gere resultados e exporte para PDF"
      icon={faChartColumn}
      actions={
        canExport ? (
          <Button type="button" variant="danger" onClick={onExport}>
            <FontAwesomeIcon icon={faFilePdf} />
            Exportar para PDF
          </Button>
        ) : null
      }
    />
  );
}

RelatoriosPageHeader.propTypes = {
  canExport: PropTypes.bool,
  onExport: PropTypes.func,
};

export default RelatoriosPageHeader;