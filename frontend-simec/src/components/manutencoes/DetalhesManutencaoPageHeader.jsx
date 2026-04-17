import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPrint,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import { Button, PageHeader } from '@/components/ui';

function DetalhesManutencaoPageHeader({ numeroOS, onPrint, onBack }) {
  return (
    <PageHeader
      title={`Detalhes da Ordem de Serviço: ${numeroOS}`}
      subtitle="Visualização, atualização e acompanhamento da OS"
      icon={faWrench}
      actions={
        <>
          <Button type="button" onClick={onPrint}>
            <FontAwesomeIcon icon={faPrint} />
            Imprimir PDF
          </Button>

          <Button type="button" variant="secondary" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>
        </>
      }
    />
  );
}

DetalhesManutencaoPageHeader.propTypes = {
  numeroOS: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onPrint: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default DetalhesManutencaoPageHeader;