import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFileMedical } from '@fortawesome/free-solid-svg-icons';

import { useFichaTecnicaPage } from '@/hooks/equipamentos/useFichaTecnicaPage';

import {
  Button,
  PageHeader,
  PageLayout,
  PageState,
} from '@/components/ui';

import {
  FichaTecnicaEventForm,
  FichaTecnicaCorretivaStepper,
} from '@/components/equipamentos/ficha-tecnica';

function FichaTecnicaPage() {
  const page = useFichaTecnicaPage();

  if (page.loading) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader title="Ficha Tecnica" icon={faFileMedical} />
          <PageState loading />
        </div>
      </PageLayout>
    );
  }

  if (!page.equipamento) {
    return (
      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader title="Ficha Tecnica" icon={faFileMedical} />
          <PageState isEmpty emptyMessage="Equipamento nao encontrado." />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title={`Ficha Tecnica: ${page.equipamento.modelo}`}
          subtitle={`Tag: ${page.equipamento.tag || 'N/A'} | Registre ocorrencias e acompanhe o ciclo corretivo`}
          icon={faFileMedical}
          actions={
            <Button type="button" variant="secondary" onClick={page.goBack}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <FichaTecnicaEventForm
          novaOcorrencia={page.novaOcorrencia}
          submitting={page.submitting}
          onChange={page.handleOcorrenciaChange}
          onSubmit={page.handleSubmitOcorrencia}
          onCancel={page.goBack}
          onLimpar={page.handleResetNovaOcorrencia}
        />

        <FichaTecnicaCorretivaStepper
          corretivas={page.corretivas}
          onAdicionarNota={page.handleAdicionarNotaCorretiva}
          onAgendarVisita={page.handleAgendarVisita}
          onResolverInternamente={page.handleResolverInternamente}
          onConcluirAcao={page.handleConcluirAcaoCorretiva}
          onImprimir={page.handleImprimirOS}
          submittingId={page.submittingCorretivaId}
        />
      </div>
    </PageLayout>
  );
}

export default FichaTecnicaPage;
