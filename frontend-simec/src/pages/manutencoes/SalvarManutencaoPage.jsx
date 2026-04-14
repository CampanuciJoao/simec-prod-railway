// src/pages/manutencoes/SalvarManutencaoPage.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faWrench } from '@fortawesome/free-solid-svg-icons';

import { useSalvarManutencaoPage } from '../../hooks/manutencoes/useSalvarManutencaoPage';

import ManutencaoForm from '../../components/manutencoes/ManutencaoForm';

import Button from '../../components/ui/primitives/Button';
import PageHeader from '../../components/ui/PageHeader';
import PageLayout from '../../components/ui/PageLayout';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/feedback/PageState';

function SalvarManutencaoPage() {
  const page = useSalvarManutencaoPage();

  const title = page.isEditing
    ? `Editar Manutenção (${page.initialData?.numeroOS || ''})`
    : 'Agendar Nova Manutenção';

  const subtitle = page.isEditing
    ? 'Atualize os dados da ordem de serviço'
    : 'Preencha os dados para criar uma nova ordem de serviço';

  /**
   * =========================
   * LOADING
   * =========================
   */
  if (page.loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageState loading />
      </PageLayout>
    );
  }

  /**
   * =========================
   * ERROR
   * =========================
   */
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

  /**
   * =========================
   * NOT FOUND (edit)
   * =========================
   */
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

        <PageState isEmpty emptyMessage="Manutenção não encontrada." />
      </PageLayout>
    );
  }

  /**
   * =========================
   * SUCCESS STATE (FORM)
   * =========================
   */
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
          todosEquipamentos={page.equipamentos}
          unidadesDisponiveis={page.unidades}
        />
      </PageSection>
    </PageLayout>
  );
}

export default SalvarManutencaoPage;