import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faWrench } from '@fortawesome/free-solid-svg-icons';

import { Button, PageHeader } from '@/components/ui';

function ManutencoesPageHeader({ onCreate }) {
  return (
    <PageHeader
      title="Gerenciamento de Manutenções"
      subtitle="Acompanhe e gerencie ordens de serviço do sistema"
      icon={faWrench}
      actions={
        <Button type="button" onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Agendar nova
        </Button>
      }
    />
  );
}

ManutencoesPageHeader.propTypes = {
  onCreate: PropTypes.func.isRequired,
};

export default ManutencoesPageHeader;
