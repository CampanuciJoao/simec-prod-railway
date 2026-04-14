import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faWrench } from '@fortawesome/free-solid-svg-icons';

import Button from '../ui/primitives/Button';
import PageHeader from '../ui/PageHeader';

function ManutencoesPageHeader({ onCreate }) {
  return (
    <PageHeader
      title="Gerenciamento de Manutenções"
      subtitle="Acompanhe e gerencie ordens de serviço do sistema"
      icon={faWrench}
      actions={
        <Button onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Agendar nova
        </Button>
      }
    />
  );
}

export default ManutencoesPageHeader;