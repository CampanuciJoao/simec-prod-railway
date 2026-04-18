import React from 'react';
import PropTypes from 'prop-types';

import { GlobalFilterBar, PageSection } from '@/components/ui';

import ContratosKpiSection from '@/components/contratos/ContratosKpiSection';
import ContratosActiveFiltersBar from '@/components/contratos/ContratosActiveFiltersBar';
import ContratoRow from '@/components/contratos/ContratoRow';

function ContratosListSection({
  contratos,
  metricas,
  searchTerm,
  onSearchChange,
  selectFiltersConfig,
  activeFilters,
  clearFilter,
  clearAllFilters,
  filtrarPorStatus,
  expandidos,
  toggleExpandir,
  uploadingId,
  handleUploadArquivo,
  handleDeleteAnexo,
  goToEdit,
  onAskDelete,
}) {
  return (
    <div className="space-y-6">
      <ContratosKpiSection
        metricas={metricas}
        clearAllFilters={clearAllFilters}
        filtrarPorStatus={filtrarPorStatus}
      />

      <GlobalFilterBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por número, fornecedor..."
        selectFilters={selectFiltersConfig}
      />

      <ContratosActiveFiltersBar
        filters={activeFilters}
        onRemove={clearFilter}
        onClearAll={clearAllFilters}
      />

      <PageSection
        title="Contratos cadastrados"
        description="Visualize detalhes, cobertura, documentos e ações disponíveis."
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
    </div>
  );
}

ContratosListSection.propTypes = {
  contratos: PropTypes.array.isRequired,
  metricas: PropTypes.object.isRequired,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  selectFiltersConfig: PropTypes.array.isRequired,
  activeFilters: PropTypes.array,
  clearFilter: PropTypes.func.isRequired,
  clearAllFilters: PropTypes.func.isRequired,
  filtrarPorStatus: PropTypes.func.isRequired,
  expandidos: PropTypes.object.isRequired,
  toggleExpandir: PropTypes.func.isRequired,
  uploadingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleUploadArquivo: PropTypes.func.isRequired,
  handleDeleteAnexo: PropTypes.func.isRequired,
  goToEdit: PropTypes.func.isRequired,
  onAskDelete: PropTypes.func.isRequired,
};

export default ContratosListSection;
