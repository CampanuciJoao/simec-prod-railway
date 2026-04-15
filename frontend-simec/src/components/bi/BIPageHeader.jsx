import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faPrint } from '@fortawesome/free-solid-svg-icons';

import PageHeader from '@/components/ui/layout/PageHeader';
import Button from '@/components/ui/primitives/Button';

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

export default BIPageHeader;