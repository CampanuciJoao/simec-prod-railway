import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMicrochip } from '@fortawesome/free-solid-svg-icons';

import { PageLayout, PageHeader, LoadingState, EmptyState } from '../../components/ui/layout';
import EquipamentoForm from '../../components/equipamentos/EquipamentoForm';
import { useSalvarEquipamentoPage } from '../../hooks/equipamentos/useSalvarEquipamentoPage';

function SalvarEquipamentoPage() {
  const {
    isEditing,
    initialData,
    loading,
    saving,
    error,
    handleSave,
    goBackToEquipamentos,
    goBackToCadastros,
  } = useSalvarEquipamentoPage();

  const actions = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={goBackToCadastros}
        disabled={saving}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar ao menu de cadastros
      </button>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={goBackToEquipamentos}
        disabled={saving}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar para equipamentos
      </button>
    </div>
  );

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
          subtitle="Cadastre e atualize informações do ativo"
          icon={faMicrochip}
          actions={actions}
        />
        <LoadingState message="Carregando equipamento..." />
      </PageLayout>
    );
  }

  if (error && isEditing && !initialData) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
          subtitle="Cadastre e atualize informações do ativo"
          icon={faMicrochip}
          actions={actions}
        />
        <EmptyState message={error} />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
        subtitle="Cadastre e atualize informações do ativo"
        icon={faMicrochip}
        actions={actions}
      />

      <EquipamentoForm
        onSubmit={handleSave}
        onCancel={goBackToEquipamentos}
        initialData={initialData}
        isEditing={isEditing}
      />
    </PageLayout>
  );
}

export default SalvarEquipamentoPage;