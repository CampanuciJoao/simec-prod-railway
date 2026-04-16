import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines, faFilePdf } from '@fortawesome/free-solid-svg-icons';

import { Button, PageHeader } from '@/components/ui';

function RelatoriosPageHeader({ canExport, onExport }) {
  return (
    <PageHeader
      title="Relatórios"
      subtitle="Gere relatórios e exporte dados consolidados do sistema"
      icon={faFileLines}
      actions={
        <Button
          type="button"
          onClick={onExport}
          disabled={!canExport}
        >
          <FontAwesomeIcon icon={faFilePdf} />
          Exportar PDF
        </Button>
      }
    />
  );
}

RelatoriosPageHeader.propTypes = {
  canExport: PropTypes.bool,
  onExport: PropTypes.func.isRequired,
};

export default RelatoriosPageHeader;