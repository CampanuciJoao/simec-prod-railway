import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileContract } from '@fortawesome/free-solid-svg-icons';

import { Button, PageHeader } from '@/components/ui';

function ContratosPageHeader({ onCreate }) {
  return (
    <PageHeader
      title="Gestão de Contratos de Manutenção"
      subtitle="Acompanhe, filtre e gerencie os contratos cadastrados"
      icon={faFileContract}
      actions={
        <Button type="button" onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Novo Contrato
        </Button>
      }
    />
  );
}

ContratosPageHeader.propTypes = {
  onCreate: PropTypes.func.isRequired,
};

export default ContratosPageHeader;
