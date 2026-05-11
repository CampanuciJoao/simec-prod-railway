import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faWrench, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

import { Button, PageHeader } from '@/components/ui';

function ManutencoesPageHeader({ onCreate, onRegistrarOcorrencia }) {
  return (
    <PageHeader
      title="Gerenciamento de Manutenções"
      subtitle="Acompanhe e gerencie ordens de serviço do sistema"
      icon={faWrench}
      actions={
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={onRegistrarOcorrencia}
            className="w-full sm:w-auto justify-center"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} />
            Registrar ocorrência
          </Button>
          <Button
            type="button"
            onClick={onCreate}
            className="w-full sm:w-auto justify-center"
          >
            <FontAwesomeIcon icon={faPlus} />
            Agendar nova
          </Button>
        </div>
      }
    />
  );
}

ManutencoesPageHeader.propTypes = {
  onCreate: PropTypes.func.isRequired,
  onRegistrarOcorrencia: PropTypes.func.isRequired,
};

export default ManutencoesPageHeader;
