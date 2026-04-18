import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faWrench } from '@fortawesome/free-solid-svg-icons';

// HOOK
import { useSalvarManutencaoPage } from '@/hooks/manutencoes/useSalvarManutencaoPage';

// DOMAIN
import ManutencaoForm from '@/components/manutencoes/ManutencaoForm';

// UI
import {
  Button,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';

function SalvarManutencaoPage() {
  const page = useSalvarManutencaoPage();

  const title = page.isEditing
    ? `Editar Manutenção (${page.initialData?.numeroOS || ''})`
    : 'Agendar Nova Manutenção';

  const subtitle = page.isEditing
    ? 'Atualize os dados da ordem de serviço'
    : 'Preencha os dados para criar uma nova ordem de serviço';

  if (page.loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageState loading />
      </PageLayout>
    );
  }

  if (page.error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={title}
          icon={faWrench}
          actions={
            <Button variant="secondary" onClick={page.goBack}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <PageState error={page.error} />
      </PageLayout>
    );
  }

  if (page.isEditing && !page.initialData) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Editar Manutenção"
          icon={faWrench}
          actions={
            <Button variant="secondary" onClick={page.goBack}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <PageState
          isEmpty
          emptyMessage="Manutenção não encontrada."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={faWrench}
        actions={
          <Button variant="secondary" onClick={page.goBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>
        }
      />

      <PageSection>
        <ManutencaoForm
          initialData={page.initialData}
          onSubmit={page.handleSave}
          isEditing={page.isEditing}
          isSubmitting={page.submitting}
          todosEquipamentos={page.equipamentos}
          unidadesDisponiveis={page.unidades}
        />
      </PageSection>
    </PageLayout>
  );
}

export default SalvarManutencaoPage;
