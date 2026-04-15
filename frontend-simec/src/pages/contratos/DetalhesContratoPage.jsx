import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFileContract } from '@fortawesome/free-solid-svg-icons';

import { useDetalhesContratoPage } from '../../hooks/contratos/useDetalhesContratoPage';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import Button from '../../components/ui/primitives/Button';

import ContratoDetalhesSection from '../../components/contratos/ContratoDetalhesSection';

function DetalhesContratoPage() {
  const page = useDetalhesContratoPage();

  const title = page.contrato?.numeroContrato
    ? `Detalhes do Contrato: ${page.contrato.numeroContrato}`
    : 'Detalhes do Contrato';

  if (page.loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Detalhes do Contrato"
          subtitle="Visualize as informações completas do contrato"
          icon={faFileContract}
          actions={
            <Button variant="secondary" onClick={page.goBack}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <PageState loading />
      </PageLayout>
    );
  }

  if (page.error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Detalhes do Contrato"
          subtitle="Visualize as informações completas do contrato"
          icon={faFileContract}
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

  if (!page.contrato) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Detalhes do Contrato"
          subtitle="Visualize as informações completas do contrato"
          icon={faFileContract}
          actions={
            <Button variant="secondary" onClick={page.goBack}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <PageState
          isEmpty
          emptyMessage="O contrato solicitado não foi encontrado."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={title}
        subtitle="Visualize as informações completas do contrato"
        icon={faFileContract}
        actions={
          <Button variant="secondary" onClick={page.goBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>
        }
      />

      <ContratoDetalhesSection contrato={page.contrato} />
    </PageLayout>
  );
}

export default DetalhesContratoPage;