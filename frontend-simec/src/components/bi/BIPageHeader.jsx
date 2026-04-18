import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faPrint } from '@fortawesome/free-solid-svg-icons';

import PropTypes from 'prop-types';

import { Button, PageHeader } from '@/components/ui';

function BIPageHeader({ ano, onPrint, canPrint = true }) {
  return (
    <PageHeader
      title={`Business Intelligence${ano ? ` - ${ano}` : ''}`}
      subtitle="Painel executivo para acompanhamento gerencial"
      icon={faChartBar}
      actions={
        <Button onClick={onPrint} disabled={!canPrint}>
          <FontAwesomeIcon icon={faPrint} />
          Imprimir relatório executivo
        </Button>
      }
    />
  );
}

BIPageHeader.propTypes = {
  ano: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onPrint: PropTypes.func.isRequired,
  canPrint: PropTypes.bool,
};

export default BIPageHeader;
