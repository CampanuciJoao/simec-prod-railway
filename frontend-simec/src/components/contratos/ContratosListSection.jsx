import React from 'react';
import PropTypes from 'prop-types';

import { PageSection } from '@/components/ui';
import ContratoRow from '@/components/contratos/ContratoRow';

function ContratosListSection({
  contratos,
  expandidos,
  toggleExpandir,
  uploadingId,
  handleUploadArquivo,
  handleDeleteAnexo,
  goToEdit,
  onAskDelete,
}) {
  return (
    <PageSection
      title="Contratos cadastrados"
      description="Visualize detalhes, cobertura, documentos e acoes disponiveis."
    >
      <div className="flex flex-col gap-4">
        {contratos.map((contrato) => (
          <ContratoRow
            key={contrato.id}
            contrato={contrato}
            isAberto={!!expandidos[contrato.id]}
            onToggleExpandir={toggleExpandir}
            onUploadArquivo={handleUploadArquivo}
            onDeleteAnexo={handleDeleteAnexo}
            onEdit={goToEdit}
            onDelete={onAskDelete}
            uploadingId={uploadingId}
          />
        ))}
      </div>
    </PageSection>
  );
}

ContratosListSection.propTypes = {
  contratos: PropTypes.array.isRequired,
  expandidos: PropTypes.object.isRequired,
  toggleExpandir: PropTypes.func.isRequired,
  uploadingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleUploadArquivo: PropTypes.func.isRequired,
  handleDeleteAnexo: PropTypes.func.isRequired,
  goToEdit: PropTypes.func.isRequired,
  onAskDelete: PropTypes.func.isRequired,
};

export default ContratosListSection;
