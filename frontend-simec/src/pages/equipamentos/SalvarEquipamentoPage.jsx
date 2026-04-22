import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';

import { useSalvarEquipamentoPage } from '@/hooks/equipamentos/useSalvarEquipamentoPage';

import { EquipamentoForm } from '@/components/equipamentos';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  PageLayout,
} from '@/components/ui';

function SalvarEquipamentoPage() {
  const {
    isEditing,
    initialData,
    loading,
    saving,
    error,
    handleSave,
    goBackToEquipamentos,
  } = useSalvarEquipamentoPage();

  const title = isEditing ? 'Editar Equipamento' : 'Novo Equipamento';
  const subtitle = 'Cadastre e atualize informações do ativo';

  const actions = (
    <div className="flex flex-wrap gap-2">
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
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader
            title={title}
            subtitle={subtitle}
            icon={faMicrochip}
            actions={actions}
          />

          <LoadingState message="Carregando equipamento..." />
        </div>
      </PageLayout>
    );
  }

  if (error && isEditing && !initialData) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader
            title={title}
            subtitle={subtitle}
            icon={faMicrochip}
            actions={actions}
          />

          <EmptyState message={error} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
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
      </div>
    </PageLayout>
  );
}

export default SalvarEquipamentoPage;
