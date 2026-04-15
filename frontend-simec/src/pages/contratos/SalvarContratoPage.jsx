import React from 'react';
import { faFileContract } from '@fortawesome/free-solid-svg-icons';

import { useSalvarContratoPage } from '../../hooks/contratos/useSalvarContratoPage';

import PageLayout from '../../components/ui/layout/PageLayout';
import PageHeader from '../../components/ui/layout/PageHeader';
import PageSection from '../../components/ui/layout/PageSection';
import PageState from '../../components/ui/feedback/PageState';
import Button from '../../components/ui/primitives/Button';

import ContratoForm from '../../components/contratos/ContratoForm';

function SalvarContratoPage() {
  const page = useSalvarContratoPage();

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
          title={
            page.isEditing
              ? 'Editar Contrato'
              : 'Cadastrar Novo Contrato'
          }
          icon={faFileContract}
          actions={
            <Button variant="secondary" onClick={page.goBack}>
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
          title="Editar Contrato"
          icon={faFileContract}
          actions={
            <Button variant="secondary" onClick={page.goBack}>
              Voltar
            </Button>
          }
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
        title={
          page.isEditing
            ? `Editar Contrato (${page.initialData?.numeroContrato || ''})`
            : 'Cadastrar Novo Contrato'
        }
        subtitle={
          page.isEditing
            ? 'Atualize os dados do contrato'
            : 'Preencha os dados para criar um novo contrato'
        }
        icon={faFileContract}
        actions={
          <Button variant="secondary" onClick={page.goBack}>
            Voltar
          </Button>
        }
      />

      <PageSection>
        <ContratoForm
          onSubmit={page.handleSave}
          initialData={page.initialData}
          isEditing={page.isEditing}
          todosEquipamentos={page.equipamentos}
          unidadesDisponiveis={page.unidades}
        />
      </PageSection>
    </PageLayout>
  );
}

export default SalvarContratoPage;