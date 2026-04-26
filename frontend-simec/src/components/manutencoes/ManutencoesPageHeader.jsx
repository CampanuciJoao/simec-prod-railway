import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTriangleExclamation, faWrench } from '@fortawesome/free-solid-svg-icons';

import { Button, PageHeader } from '@/components/ui';

function ManutencoesPageHeader({ onCreate, onRegistrarOcorrencia }) {
  return (
    <PageHeader
      title="Gerenciamento de Manutenções"
      subtitle="Acompanhe e gerencie ordens de serviço do sistema"
      icon={faWrench}
      actions={
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onRegistrarOcorrencia}>
            <FontAwesomeIcon icon={faTriangleExclamation} />
            Registrar ocorrencia
          </Button>
          <Button type="button" onClick={onCreate}>
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