import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faFileContract,
} from '@fortawesome/free-solid-svg-icons';

import { useSalvarContratoPage } from '@/hooks/contratos/useSalvarContratoPage';

import {
  Button,
  PageHeader,
  PageLayout,
  PageState,
} from '@/components/ui';

import ContratoForm from '@/components/contratos/ContratoForm';

function SalvarContratoPage() {
  const page = useSalvarContratoPage();

  const title = page.isEditing
    ? `Editar Contrato (${page.initialData?.numeroContrato || ''})`
    : 'Novo Contrato';

  const subtitle = page.isEditing
    ? 'Atualize os dados do contrato e sua cobertura operacional.'
    : 'Cadastre um novo contrato com dados de vigência e cobertura.';

  const headerActions = (
    <Button variant="secondary" onClick={page.goBack}>
      <FontAwesomeIcon icon={faArrowLeft} />
      Voltar
    </Button>
  );

  if (page.loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={title}
          subtitle={subtitle}
          icon={faFileContract}
          actions={headerActions}
        />
        <PageState loading />
      </PageLayout>
    );
  }

  if (page.error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={title}
          subtitle={subtitle}
          icon={faFileContract}
          actions={headerActions}
        />
        <PageState error={page.error} />
      </PageLayout>
    );
  }

  if (page.isEditing && !page.initialData) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Editar Contrato"
          subtitle="O contrato solicitado não foi encontrado."
          icon={faFileContract}
          actions={headerActions}
        />
        <PageState
          isEmpty
          emptyMessage="Contrato não encontrado."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={faFileContract}
        actions={headerActions}
      />

      <ContratoForm
        onSubmit={page.handleSave}
        initialData={page.initialData}
        isEditing={page.isEditing}
        todosEquipamentos={page.equipamentos}
        unidadesDisponiveis={page.unidades}
        onCancel={page.goBack}
      />
    </PageLayout>
  );
}

export default SalvarContratoPage;
