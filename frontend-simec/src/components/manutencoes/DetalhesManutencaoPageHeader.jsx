import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPrint, faWrench } from '@fortawesome/free-solid-svg-icons';

import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';

function DetalhesManutencaoPageHeader({ numeroOS, onPrint, onBack }) {
  return (
    <PageHeader
      title={`Detalhes da Ordem de Serviço: ${numeroOS}`}
      subtitle="Visualização, atualização e acompanhamento da OS"
      icon={faWrench}
      actions={
        <>
          <Button onClick={onPrint}>
            <FontAwesomeIcon icon={faPrint} />
            Imprimir PDF
          </Button>

          <Button variant="secondary" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>
        </>
      }
    />
  );
}

export default DetalhesManutencaoPageHeader;