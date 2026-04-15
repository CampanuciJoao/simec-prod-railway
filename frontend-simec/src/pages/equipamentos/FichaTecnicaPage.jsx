import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFileMedical } from '@fortawesome/free-solid-svg-icons';

import { useFichaTecnicaPage } from '@/hooks/equipamentos/useFichaTecnicaPage';

import PageLayout from '@/components/ui/layout/PageLayout';
import PageHeader from '@/components/ui/layout/PageHeader';
import PageState from '@/components/ui/feedback/PageState';
import Button from '@/components/ui/primitives/Button';

import {
  FichaTecnicaEventForm,
  FichaTecnicaTimeline,
} from '@/components/equipamentos/ficha-tecnica';

function FichaTecnicaPage() {
  const page = useFichaTecnicaPage();

  if (page.loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Ficha Técnica" icon={faFileMedical} />
        <PageState loading />
      </PageLayout>
    );
  }

  if (!page.equipamento) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Ficha Técnica" icon={faFileMedical} />
        <PageState isEmpty emptyMessage="Equipamento não encontrado." />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title={`Ficha Técnica: ${page.equipamento.modelo}`}
          subtitle={`Tag: ${page.equipamento.tag || 'N/A'} • Registro operacional rápido do equipamento`}
          icon={faFileMedical}
          actions={
            <Button
              type="button"
              variant="secondary"
              onClick={page.goBack}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <FichaTecnicaEventForm
          novoEvento={page.novoEvento}
          submitting={page.submitting}
          onChange={page.handleEventoChange}
          onSubmit={page.handleSubmitEvento}
          onCancel={page.goBack}
        />

        <FichaTecnicaTimeline
          ocorrencias={page.ocorrencias}
          itensExpandidos={page.itensExpandidos}
          dadosSolucao={page.dadosSolucao}
          resolvendoId={page.resolvendoId}
          submitting={page.submitting}
          onToggleExpandir={page.toggleExpandir}
          onChangeSolucao={page.handleSolucaoChange}
          onAbrirResolucao={page.handleAbrirResolucao}
          onCancelarResolucao={page.handleCancelarResolucao}
          onSalvarSolucao={page.handleSalvarSolucao}
        />
      </div>
    </PageLayout>
  );
}

export default FichaTecnicaPage;