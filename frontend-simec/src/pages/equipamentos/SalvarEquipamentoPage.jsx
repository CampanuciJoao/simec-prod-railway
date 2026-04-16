import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMicrochip } from '@fortawesome/free-solid-svg-icons';

import { useSalvarEquipamentoPage } from '@/hooks/equipamentos/useSalvarEquipamentoPage';

import EquipamentoForm from '@/components/equipamentos/EquipamentoForm';

import { PageLayout, PageHeader, EmptyState } from '@/components/ui/layout';
import LoadingState from '@/components/ui/feedback/LoadingState';
import { Button } from '@/components/ui/primitives';

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

  const title = isEditing ? 'Editar Equipamento' : 'Novo Equipamento';
  const subtitle = 'Cadastre e atualize informações do ativo';

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={goBackToCadastros}
        disabled={saving}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar ao menu de cadastros
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={goBackToEquipamentos}
        disabled={saving}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar para equipamentos
      </Button>
    </div>
  );

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={title}
          subtitle={subtitle}
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
          title={title}
          subtitle={subtitle}
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
        title={title}
        subtitle={subtitle}
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