import React from 'react';
import { faArrowLeft, faMicrochip, faPenToSquare, faPlus } from '@fortawesome/free-solid-svg-icons';

import { useSalvarEquipamentoPage } from '../../hooks/equipamentos/useSalvarEquipamentoPage';
import EquipamentoForm from '../../components/equipamentos/EquipamentoForm';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';

function SalvarEquipamentoPage() {
  const {
    isEditing,
    initialData,
    loading,
    error,
    handleSave,
    goBack,
  } = useSalvarEquipamentoPage();

  const showState = loading || !!error || (isEditing && !initialData && !loading);

  if (showState) {
    return (
      <div className="page-content-wrapper">
        <PageHeader
          title={
            isEditing
              ? `Editar Equipamento${initialData?.tag ? ` (Tag: ${initialData.tag})` : ''}`
              : 'Adicionar Novo Equipamento'
          }
          icon={isEditing ? faPenToSquare : faPlus}
          actions={
            <button className="btn btn-secondary" onClick={goBack}>
              Voltar
            </button>
          }
          variant="light"
        />

        <PageState
          loading={loading}
          error={error}
          isEmpty={!loading && !error && isEditing && !initialData}
          emptyMessage="Equipamento não encontrado."
        />
      </div>
    );
  }

  return (
    <div className="page-content-wrapper">
      <PageHeader
        title={
          isEditing
            ? `Editar Equipamento (Tag: ${initialData?.tag})`
            : 'Adicionar Novo Equipamento'
        }
        icon={isEditing ? faPenToSquare : faMicrochip}
        actions={
          <button className="btn btn-secondary" onClick={goBack}>
            Voltar
          </button>
        }
        variant="light"
      />

      <section className="page-section">
        <EquipamentoForm
          onSubmit={handleSave}
          initialData={initialData}
          isEditing={isEditing}
        />
      </section>
    </div>
  );
}

export default SalvarEquipamentoPage;